-- Remove the existing full access policy
DROP POLICY IF EXISTS "Allow full access to own subscriptions" ON subscriptions;

-- Create a new read-only policy
CREATE POLICY "Allow read access to own subscriptions"
    ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid());

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    UNIQUE(team_id, invitee_email)
);

-- Modify subscriptions table
ALTER TABLE subscriptions
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Enable RLS on teams, team_members, and team_invitations
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Allow read access to own teams"
    ON teams
    FOR SELECT
    USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Create policies for team_members
CREATE POLICY "Allow read access to own team memberships"
    ON team_members
    FOR SELECT
    USING (user_id = auth.uid() OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Create policies for team_invitations
CREATE POLICY "Allow read access to own team invitations"
    ON team_invitations
    FOR SELECT
    USING (inviter_id = auth.uid() OR invitee_email = auth.email());

-- Function to manage team creation, deletion, and member updates when a subscription changes
CREATE OR REPLACE FUNCTION manage_team_on_subscription_change() RETURNS TRIGGER AS $$
DECLARE
    v_team_id UUID;
    v_members_to_remove INT;
BEGIN
    -- If the new plan type is 'team' and it wasn't before, or if it's a new team subscription
    IF NEW.plan_type = 'team' AND (OLD.plan_type != 'team' OR OLD.plan_type IS NULL) THEN
        -- Create a new team
        INSERT INTO teams (name)
        VALUES (COALESCE(NEW.team_name, 'New Team')) -- Use team_name if provided, otherwise use a default name
        RETURNING id INTO v_team_id;

        -- Update the subscription with the new team_id
        NEW.team_id := v_team_id;

        -- Add the subscription owner to the team as an admin
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (v_team_id, NEW.user_id, 'admin');
    -- If the old plan type was 'team' and the new one isn't
    ELSIF OLD.plan_type = 'team' AND NEW.plan_type != 'team' THEN
        -- Delete all team members
        DELETE FROM team_members WHERE team_id = OLD.team_id;
        
        -- Delete all pending invitations
        DELETE FROM team_invitations WHERE team_id = OLD.team_id;
        
        -- Delete the team
        DELETE FROM teams WHERE id = OLD.team_id;

        -- Set the team_id to NULL in the subscription
        NEW.team_id := NULL;
    -- If the quantity has been reduced
    ELSIF NEW.quantity < OLD.quantity AND NEW.team_id IS NOT NULL THEN
        v_members_to_remove := OLD.quantity - NEW.quantity;
        -- Remove excess members, ordered by created_at descending
        WITH members_to_remove AS (
            SELECT id
            FROM team_members
            WHERE team_id = NEW.team_id
              AND user_id != NEW.user_id  -- Ensure we don't remove the team owner
            ORDER BY 
                CASE WHEN role = 'admin' THEN 1 ELSE 0 END,  -- Order members first, then admins
                created_at DESC
            LIMIT v_members_to_remove
        )
        DELETE FROM team_members
        WHERE id IN (SELECT id FROM members_to_remove);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the subscriptions table
CREATE TRIGGER create_team_on_subscription_trigger
BEFORE INSERT ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION manage_team_on_subscription_change();


-- Function to remove user from a team
CREATE OR REPLACE FUNCTION remove_user_from_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_owner_id UUID;
    v_user_role TEXT;
BEGIN
    -- Identify the team owner
    SELECT user_id INTO v_team_owner_id
    FROM subscriptions
    WHERE team_id = p_team_id AND status = 'active'
    LIMIT 1;

    IF v_team_owner_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for the team';
    END IF;

    -- Get the role of the user to be removed
    SELECT role INTO v_user_role
    FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;

    -- Check if the current user is the team owner or an admin
    IF NOT EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = p_team_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only team admins can remove members from the team';
    END IF;

    -- Prevent removing the team owner
    IF p_user_id = v_team_owner_id THEN
        RAISE EXCEPTION 'Cannot remove the team owner from the team';
    END IF;

    -- Prevent admins from removing other admins (only the owner can do this)
    IF v_user_role = 'admin' AND auth.uid() != v_team_owner_id THEN
        RAISE EXCEPTION 'Only the team owner can remove admin members';
    END IF;

    -- Remove the user from the team
    DELETE FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION remove_user_from_team TO authenticated;

-- Function to invite a user to a team
CREATE OR REPLACE FUNCTION invite_user_to_team(p_team_id UUID, p_invitee_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription_id UUID;
    v_current_members INT;
    v_max_members INT;
BEGIN
    -- Check if the current user is a team admin
    IF NOT EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = p_team_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only team admins can invite members to the team';
    END IF;

    -- Get the subscription for the team
    SELECT id, quantity INTO v_subscription_id, v_max_members
    FROM subscriptions
    WHERE team_id = p_team_id AND status = 'active'
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for the team';
    END IF;

    -- Count current team members and pending invitations
    SELECT COUNT(*) INTO v_current_members
    FROM (
        SELECT user_id FROM team_members WHERE team_id = p_team_id
        UNION ALL
        SELECT id FROM team_invitations WHERE team_id = p_team_id AND status = 'pending'
    ) AS members_and_invitations;

    -- Check if adding a new member would exceed the quantity
    IF v_current_members >= v_max_members THEN
        RAISE EXCEPTION 'Cannot invite more members. Subscription limit reached.';
    END IF;

    -- Create the invitation
    INSERT INTO team_invitations (team_id, inviter_id, invitee_email)
    VALUES (p_team_id, auth.uid(), p_invitee_email)
    ON CONFLICT (team_id, invitee_email) 
    DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION invite_user_to_team TO authenticated;

-- Function to accept a team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_id UUID;
    v_invitee_email TEXT;
BEGIN
    -- Get the invitation details
    SELECT team_id, invitee_email INTO v_team_id, v_invitee_email
    FROM team_invitations
    WHERE id = p_invitation_id AND status = 'pending';

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Check if the current user's email matches the invitation
    IF auth.email() != v_invitee_email THEN
        RAISE EXCEPTION 'This invitation is not for your email address';
    END IF;

    -- Add the user to the team
    INSERT INTO team_members (team_id, user_id)
    VALUES (v_team_id, auth.uid())
    ON CONFLICT (team_id, user_id) DO NOTHING;

    -- Update the invitation status
    UPDATE team_invitations
    SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_invitation_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION accept_team_invitation TO authenticated;

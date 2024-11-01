-- Remove the existing full access policy
DROP POLICY IF EXISTS "Allow full access to own subscriptions" ON subscriptions;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
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

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invitation_id UUID REFERENCES team_invitations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(team_id, user_id)
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

-- DROP POLICY IF EXISTS  "Allow read access to own team memberships" ON team_members;
-- Create policies for team_members
CREATE POLICY "Allow read access to own team memberships"
    ON team_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Create policies for team_invitations
CREATE POLICY "Allow read access to own team invitations"
    ON team_invitations
    FOR SELECT
    USING (inviter_id = auth.uid() OR invitee_email = auth.email());


-- Function to check if user already has a team or a subscription or a invitation
CREATE OR REPLACE FUNCTION check_user_has_team_or_subscription_or_invitation(p_user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_id UUID;
    v_subscription_id UUID;
    v_invitation_id UUID;
BEGIN
    -- Check if the user has a team
    SELECT team_id INTO v_team_id FROM team_members WHERE user_id = (SELECT id FROM auth.users WHERE email = p_user_email);

    -- Check if the user has an active subscription
    SELECT id INTO v_subscription_id
    FROM subscriptions 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = p_user_email)
    AND status = 'active'
    LIMIT 1;

    -- Check if the user has a pending or accepted invitation
    SELECT id INTO v_invitation_id
    FROM team_invitations
    WHERE invitee_email = p_user_email AND status IN ('pending', 'accepted')
    LIMIT 1;

    -- Return true if any of the conditions are met
    RETURN v_team_id IS NOT NULL OR v_subscription_id IS NOT NULL OR v_invitation_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;


-- Function to safely get the whole team by team_id
CREATE OR REPLACE FUNCTION get_team_members(p_team_id UUID)
RETURNS TABLE (
    team_id UUID,
    team_name TEXT,
    member_id UUID,
    member_user_id UUID,
    member_created_at TIMESTAMPTZ,
    member_role TEXT,
    invitation_id UUID,
    invitee_email TEXT,
    invitation_status TEXT,
    invitation_created_at TIMESTAMPTZ,
    invitation_updated_at TIMESTAMPTZ
) AS $$
BEGIN

    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id) THEN
        RAISE EXCEPTION 'Team not found %', p_team_id;
    END IF;

    RETURN QUERY
    SELECT 
        t.id AS team_id,
        t.name AS team_name,
        tm.id AS member_id,
        tm.user_id AS member_user_id,
        tm.created_at AS member_created_at,
        tm.role AS member_role,
        ti.id AS invitation_id,
        ti.invitee_email,
        ti.status AS invitation_status,
        ti.created_at AS invitation_created_at,
        ti.updated_at AS invitation_updated_at
    FROM 
        teams t
    JOIN 
        team_invitations ti ON t.id = ti.team_id
    LEFT JOIN 
        team_members tm ON ti.id = tm.invitation_id
    WHERE 
        t.id = p_team_id
        AND (
            -- Allow admins or owners to view all members
            EXISTS (
                SELECT 1 
                FROM team_members tm2
                WHERE tm2.team_id = p_team_id 
                AND tm2.user_id = auth.uid() 
                AND (tm2.role = 'admin' OR tm2.role = 'owner')
            )
            -- Allow team members to view themselves
            OR tm.user_id = auth.uid()
            -- Allow invited users to view their own invitation
            OR ti.invitee_email = auth.email()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to manage team creation, deletion, and member updates when a subscription changes
CREATE OR REPLACE FUNCTION manage_team_on_subscription_change() RETURNS TRIGGER AS $$
DECLARE
    v_team_id UUID;
    v_members_to_remove INT;
    v_invitations_to_remove INT;
    v_owner_email TEXT;
BEGIN
    -- If the new plan type is 'team' and it wasn't before, or if it's a new team subscription
    IF NEW.team_id IS NULL AND NEW.plan_type = 'team' AND (OLD.plan_type != 'team' OR OLD.plan_type IS NULL) THEN
        -- Create a new team
        INSERT INTO teams (name)
        VALUES (COALESCE(NEW.team_name, 'New Team')) -- Use team_name if provided, otherwise use a default name
        RETURNING id INTO v_team_id;

        -- Update the subscription with the new team_id
        NEW.team_id := v_team_id;

        -- Get the owner's email
        SELECT email INTO v_owner_email
        FROM auth.users
        WHERE id = NEW.user_id;

        -- Create a team_invitation for the owner
        INSERT INTO team_invitations (team_id, inviter_id, invitee_email, status, updated_at)
        VALUES (v_team_id, NEW.user_id, v_owner_email, 'accepted', CURRENT_TIMESTAMP);

        -- Add the subscription owner to the team as an owner
        INSERT INTO team_members (team_id, user_id, role, invitation_id)
        VALUES (v_team_id, NEW.user_id, 'owner', (SELECT id FROM team_invitations WHERE team_id = v_team_id AND invitee_email = v_owner_email AND status = 'accepted'));

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

        -- Remove rejected invitations first
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        IF v_members_to_remove > 0 THEN
            DELETE FROM team_invitations
            WHERE id IN (
                SELECT id
                FROM team_invitations
                WHERE team_id = NEW.team_id AND status = 'rejected'
                ORDER BY created_at DESC
                LIMIT v_members_to_remove
            );
        END IF;


        -- Remove pending invitations
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        IF v_members_to_remove > 0 THEN
            DELETE FROM team_invitations
            WHERE id IN (
                SELECT id
                FROM team_invitations
                WHERE team_id = NEW.team_id AND status = 'pending'
                ORDER BY created_at DESC
                LIMIT v_members_to_remove
            );
        END IF;

        -- Remove non-admin team members
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        IF v_members_to_remove > 0 THEN
            DELETE FROM team_invitations
            WHERE id IN (
                SELECT ti.id
                FROM team_invitations ti
                JOIN team_members tm ON ti.id = tm.invitation_id
                WHERE tm.team_id = NEW.team_id
                    AND tm.user_id != NEW.user_id
                    AND tm.role NOT IN ('admin', 'owner')
                ORDER BY COALESCE(ti.created_at, tm.created_at) DESC
                LIMIT v_members_to_remove
            );
        END IF;

        -- Remove admin team members
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        -- Remove admin team members if necessary
        IF v_members_to_remove > 0 THEN
            DELETE FROM team_invitations
            WHERE id IN (
                SELECT ti.id
                FROM team_invitations ti
                JOIN team_members tm ON ti.id = tm.invitation_id
                WHERE tm.team_id = NEW.team_id
                    AND tm.user_id != NEW.user_id
                    AND tm.role = 'admin'
                ORDER BY COALESCE(ti.created_at, tm.created_at) DESC
                LIMIT v_members_to_remove
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the subscriptions table
CREATE TRIGGER manage_team_on_subscription_trigger
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION manage_team_on_subscription_change();


-- Function to remove user from a team
CREATE OR REPLACE FUNCTION remove_user_from_team(p_team_id UUID, p_user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_owner_id UUID;
    v_user_role TEXT;
    v_user_id UUID;
BEGIN
    -- Get the user ID based on the email   
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email;

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
    WHERE team_id = p_team_id AND user_id = v_user_id;

    -- Check if the current user is the team owner or an admin
    IF NOT EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = p_team_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Only team admins can remove members from the team';
    END IF;

    -- Prevent removing the team owner
    IF v_user_id = v_team_owner_id THEN
        RAISE EXCEPTION 'Cannot remove the team owner from the team';
    END IF;

    -- Prevent admins from removing other admins (only the owner can do this)
    IF v_user_role = 'admin' AND auth.uid() != v_team_owner_id THEN
        RAISE EXCEPTION 'Only the team owner can remove admin members';
    END IF;

    -- Remove the user from the team
    DELETE FROM team_members
    WHERE team_id = p_team_id AND user_id = v_user_id;

    DELETE FROM team_invitations
    WHERE team_id = p_team_id AND invitee_email = p_user_email;

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

    -- Check if the invitee already has a team, subscription, or pending invitation
    IF check_user_has_team_or_subscription_or_invitation(p_invitee_email) THEN
        RAISE EXCEPTION 'User already has a team, subscription, or pending invitation';
    END IF;

    -- Get the subscription for the team
    SELECT id, quantity INTO v_subscription_id, v_max_members
    FROM subscriptions
    WHERE team_id = p_team_id AND status = 'active'
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for the team';
    END IF;

    -- Check if the user is already a team member or has a pending invitation
    IF EXISTS (
        SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = (SELECT id FROM auth.users WHERE email = p_invitee_email)
        UNION ALL
        SELECT 1 FROM team_invitations WHERE team_id = p_team_id AND invitee_email = p_invitee_email AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'User is already a team member or has a pending invitation';
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
    VALUES (p_team_id, auth.uid(), p_invitee_email);

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
    v_invitation_id UUID;
BEGIN
    -- Get the invitation details
    SELECT team_id, invitee_email, id INTO v_team_id, v_invitee_email, v_invitation_id
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
    INSERT INTO team_members (team_id, user_id, invitation_id)
    VALUES (v_team_id, auth.uid(), v_invitation_id)
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


CREATE OR REPLACE FUNCTION reject_team_invitation(p_invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_id UUID;
    v_invitee_email TEXT;
    v_invitation_id UUID;
BEGIN
    -- Get the invitation details
    SELECT team_id, invitee_email, id INTO v_team_id, v_invitee_email, v_invitation_id
    FROM team_invitations
    WHERE id = p_invitation_id AND status = 'pending';

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Check if the current user's email matches the invitation
    IF auth.email() != v_invitee_email THEN
        RAISE EXCEPTION 'This invitation is not for your email address';
    END IF;

    -- Update the invitation status
    UPDATE team_invitations
    SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_invitation_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION reject_team_invitation TO authenticated;

-- Create a new read-only policy
DROP POLICY IF EXISTS "Allow read access to own subscriptions" ON subscriptions;

CREATE POLICY "Allow read access to own subscriptions"
    ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid() OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));


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
    UNIQUE(team_id, user_id)
);

-- Modify subscriptions table
ALTER TABLE subscriptions
DROP COLUMN team_name,
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Enable RLS on teams and team_members
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

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

        -- Add the subscription owner to the team
        INSERT INTO team_members (team_id, user_id)
        VALUES (v_team_id, NEW.user_id);
    -- If the old plan type was 'team' and the new one isn't
    ELSIF OLD.plan_type = 'team' AND NEW.plan_type != 'team' THEN
        -- Delete all team members
        DELETE FROM team_members WHERE team_id = OLD.team_id;
        
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
            ORDER BY created_at DESC
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


-- Function to add user to a team
CREATE OR REPLACE FUNCTION add_user_to_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription_id UUID;
    v_current_members INT;
    v_max_members INT;
    v_team_owner_id UUID;
BEGIN
    -- Get the subscription for the team and identify the team owner
    SELECT id, quantity, user_id INTO v_subscription_id, v_max_members, v_team_owner_id
    FROM subscriptions
    WHERE team_id = p_team_id AND status = 'active'
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for the team';
    END IF;

    -- Check if the current user is the team owner
    IF v_team_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the team owner can add members to the team';
    END IF;

    -- Count current team members
    SELECT COUNT(*) INTO v_current_members
    FROM team_members
    WHERE team_id = p_team_id;

    -- Check if adding a new member would exceed the quantity
    IF v_current_members >= v_max_members THEN
        RAISE EXCEPTION 'Cannot add more members. Subscription limit reached.';
    END IF;

    -- Add the user to the team
    INSERT INTO team_members (team_id, user_id)
    VALUES (p_team_id, p_user_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION add_user_to_team TO authenticated;


-- Function to remove user from a team
CREATE OR REPLACE FUNCTION remove_user_from_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_team_owner_id UUID;
BEGIN
    -- Identify the team owner
    SELECT user_id INTO v_team_owner_id
    FROM subscriptions
    WHERE team_id = p_team_id AND status = 'active'
    LIMIT 1;

    IF v_team_owner_id IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for the team';
    END IF;

    -- Check if the current user is the team owner
    IF v_team_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the team owner can remove members from the team';
    END IF;

    -- Prevent removing the team owner
    IF p_user_id = v_team_owner_id THEN
        RAISE EXCEPTION 'Cannot remove the team owner from the team';
    END IF;

    -- Remove the user from the team
    DELETE FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION remove_user_from_team TO authenticated;

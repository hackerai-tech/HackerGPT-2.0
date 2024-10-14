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
            WHERE team_id = NEW.team_id AND status = 'rejected';
        END IF;


        -- Remove pending invitations
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        IF v_members_to_remove > 0 THEN
            WITH invitations_to_remove AS (
                SELECT ti.id
                FROM team_invitations ti
                WHERE ti.team_id = NEW.team_id AND ti.status = 'pending'
                ORDER BY ti.created_at DESC
                LIMIT v_members_to_remove
            )
            DELETE FROM team_invitations
            WHERE id IN (SELECT id FROM invitations_to_remove);
        END IF;

        -- Remove non-admin team members
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        IF v_members_to_remove > 0 THEN            
            WITH members_to_remove AS (
                SELECT tm.id, tm.invitation_id
                FROM team_members tm
                LEFT JOIN team_invitations ti ON tm.invitation_id = ti.id
                WHERE tm.team_id = NEW.team_id
                    AND tm.user_id != NEW.user_id  -- Ensure we don't remove the team owner
                    AND tm.role != 'admin' AND tm.role != 'owner'
                ORDER BY COALESCE(ti.created_at, tm.created_at) DESC
                LIMIT v_members_to_remove
            )
            DELETE FROM team_invitations
            WHERE id IN (SELECT invitation_id FROM members_to_remove);

        END IF;

        -- Remove admin team members
        SELECT COUNT(*) INTO v_members_to_remove       
            FROM team_invitations ti
            WHERE ti.team_id = NEW.team_id;

        v_members_to_remove := v_members_to_remove - NEW.quantity;

        -- Remove admin team members if necessary
        IF v_members_to_remove > 0 THEN
            WITH members_to_remove AS (
                SELECT tm.id, tm.invitation_id
                FROM team_members tm
                LEFT JOIN team_invitations ti ON tm.invitation_id = ti.id
                WHERE tm.team_id = NEW.team_id
                    AND tm.user_id != NEW.user_id  -- Ensure we don't remove the team owner
                    AND tm.role = 'admin'
                ORDER BY COALESCE(ti.created_at, tm.created_at) DESC
                LIMIT v_members_to_remove
            )
            DELETE FROM team_invitations
            WHERE id IN (SELECT invitation_id FROM members_to_remove);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists before dropping it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'manage_team_on_subscription_trigger') THEN
        DROP TRIGGER manage_team_on_subscription_trigger ON subscriptions;
    END IF;
END $$;

CREATE TRIGGER manage_team_on_subscription_trigger
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION manage_team_on_subscription_change();

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Recreate the function with MFA check
CREATE OR REPLACE FUNCTION delete_user(sel_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
    is_authorized BOOLEAN;
BEGIN
    SELECT 
        CASE 
            WHEN auth.uid() = sel_user_id THEN TRUE
            ELSE FALSE
        END INTO is_authorized;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Not authorized to delete this user';
    END IF;

    -- Add MFA check
    IF NOT check_mfa() THEN
        RAISE EXCEPTION 'MFA verification required to delete account';
    END IF;

    DELETE FROM chats WHERE user_id = sel_user_id;
    DELETE FROM workspaces WHERE user_id = sel_user_id;
    DELETE FROM team_invitations WHERE invitee_email = (select email from auth.users where id = sel_user_id);
    DELETE FROM team_members WHERE user_id = sel_user_id;
    UPDATE feedback SET user_id = NULL WHERE user_id = sel_user_id;
    DELETE FROM subscriptions WHERE user_id = sel_user_id;

    DELETE FROM auth.users 
    WHERE id = sel_user_id;
END;
$$; 
--Temporary file, will be removed after testing, all functions here are already in the team migration


-- Function to accept a team invitation
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

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION check_user_has_team_or_subscription_or_invitation TO authenticated;
-- Create the helper function for MFA checks
CREATE OR REPLACE FUNCTION public.check_mfa()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        array[auth.jwt()->>'aal'] <@ (
            SELECT
                CASE
                    WHEN count(id) > 0 THEN array['aal2']
                    ELSE array['aal1', 'aal2']
                END
            FROM auth.mfa_factors
            WHERE auth.uid() = user_id AND status = 'verified'
        )
    );
END;
$$;

-- Workspaces and related tables
create policy "Require MFA verification for users who enabled it"
on workspaces
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on file_workspaces
as restrictive
to authenticated
using (check_mfa());

-- Files and related tables
create policy "Require MFA verification for users who enabled it"
on files
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on file_items
as restrictive
to authenticated
using (check_mfa());

-- Messages and related tables
create policy "Require MFA verification for users who enabled it"
on messages
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on message_file_items
as restrictive
to authenticated
using (check_mfa());

-- Chats and related tables
create policy "Require MFA verification for users who enabled it"
on chats
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on chat_files
as restrictive
to authenticated
using (check_mfa());

-- Teams and related tables
create policy "Require MFA verification for users who enabled it"
on teams
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on team_members
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on team_invitations
as restrictive
to authenticated
using (check_mfa());

-- Profiles and subscriptions
create policy "Require MFA verification for users who enabled it"
on profiles
as restrictive
to authenticated
using (check_mfa());

create policy "Require MFA verification for users who enabled it"
on subscriptions
as restrictive
to authenticated
using (check_mfa());
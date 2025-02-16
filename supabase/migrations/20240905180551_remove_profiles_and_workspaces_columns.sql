-- Remove columns from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS bio;

-- Remove columns from workspaces table
ALTER TABLE workspaces
DROP COLUMN IF EXISTS default_prompt,
DROP COLUMN IF EXISTS embeddings_provider;

-- Update create_profile_and_workspace function
CREATE OR REPLACE FUNCTION create_profile_and_workspace() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create a profile for the new user
    INSERT INTO public.profiles(user_id, has_onboarded, image_url, image_path, profile_context)
    VALUES(
        NEW.id,
        FALSE,
        '',
        '',
        ''
    );

    INSERT INTO public.workspaces(user_id, is_home, name, default_model, include_profile_context)
    VALUES(
        NEW.id,
        TRUE,
        'Home',
        'mistral-medium',
        TRUE
    );
    
    RETURN NEW;
END;
$$;
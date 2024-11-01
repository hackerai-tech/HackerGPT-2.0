-- Remove columns from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS display_name,
DROP COLUMN IF EXISTS mistral_api_key,
DROP COLUMN IF EXISTS openai_api_key,
DROP COLUMN IF EXISTS openai_organization_id;

-- Remove columns from workspaces table
ALTER TABLE workspaces
DROP COLUMN IF EXISTS default_context_length,
DROP COLUMN IF EXISTS default_temperature,
DROP COLUMN IF EXISTS description;

-- Update create_profile_and_workspace function
CREATE OR REPLACE FUNCTION create_profile_and_workspace() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create a profile for the new user
    INSERT INTO public.profiles(user_id, has_onboarded, image_url, image_path, bio, profile_context)
    VALUES(
        NEW.id,
        FALSE,
        '',
        '',
        '',
        ''
    );

    INSERT INTO public.workspaces(user_id, is_home, name, default_model, default_prompt, embeddings_provider, include_profile_context)
    VALUES(
        NEW.id,
        TRUE,
        'Home',
        'mistral-medium',
        'You are a friendly, helpful AI assistant.',
        'openai',
        TRUE
    );

    RETURN NEW;
END;
$$;

-- Remove unique constraint on username
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Remove index on user_id (if it's no longer needed)
DROP INDEX IF EXISTS idx_profiles_user_id;
-- Drop existing trigger first
DROP TRIGGER IF EXISTS delete_old_profile_image ON profiles;

-- Create updated trigger function
CREATE OR REPLACE FUNCTION delete_old_profile_image()
RETURNS TRIGGER
LANGUAGE 'plpgsql'
SECURITY DEFINER
AS $$
DECLARE
  status INT;
  content TEXT;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.image_path IS NOT NULL AND OLD.image_path != '' THEN
    SELECT
      INTO status, content
      result.status, result.content
      FROM public.delete_storage_object_from_bucket('profile_images', OLD.image_path) AS result;
    IF status <> 200 THEN
      RAISE WARNING 'Could not delete profile image: % %', status, content;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger with updated function
CREATE TRIGGER delete_old_profile_image
AFTER DELETE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE delete_old_profile_image(); 
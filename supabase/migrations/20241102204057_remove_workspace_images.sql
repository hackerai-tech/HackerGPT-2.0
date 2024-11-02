-- Remove image-related columns from workspaces table
ALTER TABLE workspaces
DROP COLUMN IF EXISTS image_path;

-- Remove workspace_images bucket
DROP POLICY IF EXISTS "Allow authenticated delete access to own workspace images" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'workspace_images';
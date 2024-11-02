-- First delete all objects in the workspace_images bucket
DELETE FROM storage.objects 
WHERE bucket_id = 'workspace_images';

-- Then remove the bucket
DELETE FROM storage.buckets 
WHERE id = 'workspace_images';

-- Remove image-related columns from workspaces table
ALTER TABLE workspaces
DROP COLUMN IF EXISTS image_path;

-- Remove workspace_images policies
DROP POLICY IF EXISTS "Allow authenticated delete access to own workspace images" ON storage.objects;
DO $$ 
BEGIN
    -- First remove policies that might depend on the function
    DO $policies$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access on non-private workspace images') THEN
            DROP POLICY IF EXISTS "Allow public read access on non-private workspace images" ON storage.objects;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert access to own workspace images') THEN
            DROP POLICY IF EXISTS "Allow insert access to own workspace images" ON storage.objects;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update access to own workspace images') THEN
            DROP POLICY IF EXISTS "Allow update access to own workspace images" ON storage.objects;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow delete access to own workspace images') THEN
            DROP POLICY IF EXISTS "Allow delete access to own workspace images" ON storage.objects;
        END IF;
    END $policies$;

    -- Now we can safely drop the function
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proname = 'non_private_workspace_exists') THEN
        DROP FUNCTION IF EXISTS public.non_private_workspace_exists(p_name text);
    END IF;

    -- Check and drop trigger if it still exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'delete_old_workspace_image') THEN
        DROP TRIGGER IF EXISTS delete_old_workspace_image ON workspaces;
    END IF;

    -- Drop the trigger function if it still exists
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proname = 'delete_old_workspace_image') THEN
        DROP FUNCTION IF EXISTS delete_old_workspace_image();
    END IF;

    -- Double check column removal
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'workspaces' 
               AND column_name = 'image_path') THEN
        ALTER TABLE workspaces
        DROP COLUMN IF EXISTS image_path;
    END IF;

    RAISE NOTICE 'Workspace images cleanup verification completed successfully';
END $$; 
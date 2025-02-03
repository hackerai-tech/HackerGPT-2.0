DO $$ 
BEGIN
    -- Only attempt to drop triggers if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistants') THEN
        DROP TRIGGER IF EXISTS update_assistants_updated_at ON assistants;
        DROP TRIGGER IF EXISTS delete_old_assistant_image ON assistants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistant_workspaces') THEN
        DROP TRIGGER IF EXISTS update_assistant_workspaces_updated_at ON assistant_workspaces;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistant_files') THEN
        DROP TRIGGER IF EXISTS update_assistant_files_updated_at ON assistant_files;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistant_tools') THEN
        DROP TRIGGER IF EXISTS update_assistant_tools_updated_at ON assistant_tools;
    END IF;
END $$;

-- Storage policies can be dropped safely with IF EXISTS
DROP POLICY IF EXISTS "Allow public read access on non-private assistant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert access to own assistant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow update access to own assistant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete access to own assistant images" ON storage.objects;

-- Drop constraint from chats table if it exists
ALTER TABLE IF EXISTS chats DROP CONSTRAINT IF EXISTS chats_assistant_id_fkey;

-- Drop indexes safely
DROP INDEX IF EXISTS assistants_user_id_idx;
DROP INDEX IF EXISTS assistants_pkey;
DROP INDEX IF EXISTS assistant_workspaces_user_id_idx;
DROP INDEX IF EXISTS assistant_workspaces_assistant_id_idx;
DROP INDEX IF EXISTS assistant_workspaces_workspace_id_idx;
DROP INDEX IF EXISTS assistant_workspaces_pkey;
DROP INDEX IF EXISTS assistant_files_user_id_idx;
DROP INDEX IF EXISTS assistant_files_assistant_id_idx;
DROP INDEX IF EXISTS assistant_files_file_id_idx;
DROP INDEX IF EXISTS assistant_files_pkey;
DROP INDEX IF EXISTS assistant_tools_user_id_idx;
DROP INDEX IF EXISTS assistant_tools_assistant_id_idx;
DROP INDEX IF EXISTS assistant_tools_tool_id_idx;
DROP INDEX IF EXISTS assistant_tools_pkey;

-- Drop tables safely
DROP TABLE IF EXISTS assistant_workspaces;
DROP TABLE IF EXISTS assistant_files;
DROP TABLE IF EXISTS assistant_tools;
DROP TABLE IF EXISTS assistants;

-- Drop function safely
DROP FUNCTION IF EXISTS public.non_private_assistant_exists(p_name text);
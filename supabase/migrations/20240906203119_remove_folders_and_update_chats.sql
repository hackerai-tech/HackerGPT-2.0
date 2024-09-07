DO $$
BEGIN
    -- Remove folder-related columns and objects
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'folder_id') THEN
        ALTER TABLE chats DROP COLUMN folder_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'folder_id') THEN
        ALTER TABLE files DROP COLUMN folder_id;
    END IF;

    DROP TABLE IF EXISTS folders;

    -- Remove assistant_id, context_length, and embeddings_provider from chats table
    ALTER TABLE chats 
    DROP COLUMN IF EXISTS assistant_id,
    DROP COLUMN IF EXISTS context_length,
    DROP COLUMN IF EXISTS embeddings_provider;

    -- Update chats table constraints
    ALTER TABLE chats
    DROP CONSTRAINT IF EXISTS chats_context_length_check,
    DROP CONSTRAINT IF EXISTS chats_embeddings_provider_check;

    -- Clean up any orphaned data
    DELETE FROM chat_files WHERE chat_id NOT IN (SELECT id FROM chats);
    DELETE FROM file_workspaces WHERE file_id NOT IN (SELECT id FROM files);

    -- Recreate necessary indexes
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id);
    CREATE INDEX IF NOT EXISTS idx_chats_workspace_id ON chats (workspace_id);
    CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);

    RAISE NOTICE 'Migration complete. Please review and manually remove any unused functions, triggers, or policies related to folders if necessary.';
END $$;

-- Drop indexes, policies, and triggers related to folders
DROP INDEX IF EXISTS folders_user_id_idx;
DROP INDEX IF EXISTS folders_workspace_id_idx;

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
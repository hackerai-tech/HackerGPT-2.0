DO $$
BEGIN
    -- Remove context_length and embeddings_provider from chats table
    ALTER TABLE chats 
    DROP COLUMN IF EXISTS context_length,
    DROP COLUMN IF EXISTS embeddings_provider;

    -- Clean up any orphaned data
    DELETE FROM chat_files WHERE chat_id NOT IN (SELECT id FROM chats);
    DELETE FROM file_workspaces WHERE file_id NOT IN (SELECT id FROM files);

    RAISE NOTICE 'Migration complete. Please review and manually remove any unused functions, triggers, or policies related to folders if necessary.';
END $$;
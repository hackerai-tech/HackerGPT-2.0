-- Previous policy allowed read access to non-private workspaces:
-- CREATE POLICY "Allow view access to non-private workspaces"
--     ON workspaces
--     FOR SELECT
--     USING (sharing <> 'private');
DROP POLICY IF EXISTS  "Allow view access to non-private workspaces" ON workspaces;


-- CREATE POLICY "Allow view access to non-private files"
--     ON files
--     FOR SELECT
--     USING (sharing <> 'private');
DROP POLICY IF EXISTS "Allow view access to non-private files" ON files;


-- CREATE POLICY "Allow view access to non-private file items"
--     ON file_items
--     FOR SELECT
--     USING (file_id IN (
--         SELECT id FROM files WHERE sharing <> 'private'
--     ));
DROP POLICY IF EXISTS  "Allow view access to non-private file items" ON file_items;


-- Previous policy allowed read access to messages in non-private chats:
-- CREATE POLICY "Allow view access to messages for non-private chats"
--     ON messages
--     FOR SELECT
--     USING (chat_id IN (
--         SELECT id FROM chats WHERE sharing <> 'private'
--     ));

DROP POLICY IF EXISTS "Allow view access to messages for non-private chats" ON messages;

-- Previous policy allowed read access to message images if:
-- 1. The image is in the message_images bucket AND
-- 2. Either:
--    a. The user owns the image (folder name starts with their user ID) OR 
--    b. The image belongs to a message in a non-private chat
-- CREATE POLICY "Allow read access to own message images"
--     ON storage.objects FOR SELECT
--     USING (
--         (bucket_id = 'message_images'::text) AND 
--         (
--             (storage.foldername(name))[1] = auth.uid()::text OR
--             (
--                 EXISTS (
--                     SELECT 1 FROM chats 
--                     WHERE id = (
--                         SELECT chat_id FROM messages WHERE id = (storage.foldername(objects.name))[3]::uuid
--                     ) AND sharing <> 'private'::text
--                 )
--             )
--         )
--     );

DROP POLICY IF EXISTS "Allow read access to own message images" ON storage.objects;
CREATE POLICY "Allow read access to own message images"
    ON storage.objects FOR SELECT
    USING (
        (bucket_id = 'message_images'::text) AND 
        (storage.foldername(name))[1] = auth.uid()::text 
    );


-- Already removed in previous migration
-- CREATE POLICY "Allow view access to non-private prompts"
--     ON prompts
--     FOR SELECT
--     USING (sharing <> 'private');
-- DROP POLICY "Allow view access to non-private prompts" ON prompts;

-- Already removed in previous migration
-- CREATE POLICY "Allow view access to non-private tools"
--     ON tools
--     FOR SELECT
--     USING (sharing <> 'private');
-- DROP POLICY "Allow view access to non-private tools" ON tools;


-- Already removed in previous migration
-- CREATE POLICY "Allow view access to non-private models"
--     ON models
--     FOR SELECT
--     USING (sharing <> 'private');
-- DROP POLICY "Allow view access to non-private models" ON models;

-- CREATE POLICY "Allow view access to citations for non-private chats"
--     ON messages
--     FOR SELECT
--     USING (chat_id IN (
--         SELECT id FROM chats WHERE sharing <> 'private'
--     ));

DROP POLICY IF EXISTS  "Allow view access to citations for non-private chats" ON messages;


-- CREATE POLICY "Allow view access to non-private chats"
--     ON chats
--     FOR SELECT
--     USING (sharing <> 'private');

DROP POLICY IF EXISTS  "Allow view access to non-private chats" ON chats;

-- Function to get messages up to the last shared message in a chat
CREATE OR REPLACE FUNCTION get_shared_chat_messages(chat_id_param UUID)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    content TEXT,
    image_paths TEXT[],
    model TEXT,
    role TEXT,
    sequence_number INTEGER,
    plugin VARCHAR,
    rag_used BOOLEAN,
    rag_id UUID,
    citations TEXT[],
    fragment JSONB,
    thinking_enabled BOOLEAN,
    thinking_content TEXT,
    thinking_elapsed_secs INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_last_shared_message_id UUID;
BEGIN
    -- Get the last_shared_message_id for this chat
    SELECT last_shared_message_id INTO var_last_shared_message_id
    FROM chats c
    WHERE c.id = chat_id_param and c.sharing <> 'private';

    -- Only return messages if chat has a last_shared_message_id
    IF var_last_shared_message_id IS NOT NULL THEN
        RETURN QUERY
        WITH numbered_messages AS (
            SELECT 
                messages.*,
                row_number() OVER (ORDER BY messages.created_at ASC, messages.sequence_number ASC) as row_num
            FROM messages
            WHERE messages.chat_id = chat_id_param
        ),
        target_message AS (
            SELECT row_num as target_index
            FROM numbered_messages 
            WHERE numbered_messages.id = var_last_shared_message_id
        )
        SELECT 
            numbered_messages.id,
            numbered_messages.chat_id,
            numbered_messages.user_id,
            numbered_messages.created_at,
            numbered_messages.updated_at,
            numbered_messages.content,
            numbered_messages.image_paths,
            numbered_messages.model,
            numbered_messages.role,
            numbered_messages.sequence_number,
            numbered_messages.plugin,
            numbered_messages.rag_used,
            numbered_messages.rag_id,
            numbered_messages.citations,
            numbered_messages.fragment,
            numbered_messages.thinking_enabled,
            numbered_messages.thinking_content,
            numbered_messages.thinking_elapsed_secs
        FROM numbered_messages, target_message
        WHERE row_num <= target_index
        ORDER BY numbered_messages.created_at ASC, numbered_messages.sequence_number ASC;
    END IF;
END;
$$;

-- Function to get a single chat by share_id
CREATE OR REPLACE FUNCTION get_shared_chat(share_id_param UUID) 
RETURNS TABLE (
    id UUID,
    name TEXT,
    shared_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.updated_at as shared_at
    FROM chats c
    WHERE c.last_shared_message_id = share_id_param and c.sharing <> 'private';
END;
$$;


CREATE OR REPLACE FUNCTION is_message_shared(message_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chat_id UUID;
    v_last_shared_message_id UUID;
    v_message_rn INT;
    v_target_rn INT;
BEGIN
    -- Get the chat id for the given message
    SELECT chat_id INTO v_chat_id
    FROM messages
    WHERE id = message_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message with id % not found', message_id_param;
    END IF;
    
    -- Retrieve the chat's last_shared_message_id only if the chat is not private
    SELECT last_shared_message_id INTO v_last_shared_message_id
    FROM chats
    WHERE id = v_chat_id AND sharing <> 'private';
    
    -- If there is no last_shared_message_id, the chat is not shared
    IF v_last_shared_message_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If the provided message is exactly the last shared message, it is shared
    IF message_id_param = v_last_shared_message_id THEN
        RETURN TRUE;
    END IF;
    
    -- Determine the ordering position of the given message and the last shared message
    WITH ordered_messages AS (
        SELECT
            id,
            row_number() OVER (ORDER BY created_at ASC, sequence_number ASC) AS rn
        FROM messages
        WHERE chat_id = v_chat_id
    )
    SELECT
        (SELECT rn FROM ordered_messages WHERE id = message_id_param),
        (SELECT rn FROM ordered_messages WHERE id = v_last_shared_message_id)
    INTO v_message_rn, v_target_rn;
    
    -- If for some reason we couldn't determine the positions, consider it not shared
    IF v_message_rn IS NULL OR v_target_rn IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- The message is shared if its row number is less than or equal to the last shared message row number
    IF v_message_rn <= v_target_rn THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;




CREATE POLICY "Allow read access to message images in non-private chats"
    ON storage.objects FOR SELECT
    USING (
        (bucket_id = 'message_images'::text) AND
        (is_message_shared((storage.foldername(objects.name))[3]::uuid))
    );

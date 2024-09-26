DROP POLICY IF EXISTS "Allow read access to own message images" ON storage.objects;

CREATE POLICY "Allow read access to own message images"
    ON storage.objects FOR SELECT
    USING (
        (bucket_id = 'message_images'::text) AND 
        (
            (storage.foldername(name))[1] = auth.uid()::text OR
            (
                EXISTS (
                    SELECT 1 FROM chats 
                    WHERE id = (
                        SELECT chat_id FROM messages WHERE id = (storage.foldername(objects.name))[3]::uuid
                    ) AND sharing <> 'private'::text
                )
            )
        )
    );

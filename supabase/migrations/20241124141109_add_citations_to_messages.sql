-- Add citations column to messages table as a simple text array for URLs
ALTER TABLE messages 
ADD COLUMN citations TEXT[] NOT NULL DEFAULT '{}';

-- Add constraint to limit the number of citations (URLs)
ALTER TABLE messages
ADD CONSTRAINT check_citations_length 
CHECK (array_length(citations, 1) <= 20);

-- Update existing messages to have empty citations array
UPDATE messages 
SET citations = '{}'::text[] 
WHERE citations IS NULL;

-- Update RLS policies to include citations
CREATE POLICY "Allow view access to citations for non-private chats"
    ON messages
    FOR SELECT
    USING (chat_id IN (
        SELECT id FROM chats WHERE sharing <> 'private'
    ));
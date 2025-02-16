-- Add messages_id column to files table
ALTER TABLE files
ADD COLUMN message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Create index on message_id
CREATE INDEX idx_files_message_id ON files(message_id);

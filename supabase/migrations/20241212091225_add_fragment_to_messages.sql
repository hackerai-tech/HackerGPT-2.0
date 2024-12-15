-- Add fragment column to messages table as a JSONB object
ALTER TABLE messages 
ADD COLUMN fragment JSONB NULL DEFAULT NULL;
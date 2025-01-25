-- Add thinking-related columns to messages table if they don't exist
DO $$ 
BEGIN 
    -- Add thinking_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'messages' AND column_name = 'thinking_enabled') THEN
        ALTER TABLE messages 
        ADD COLUMN thinking_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add thinking_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'messages' AND column_name = 'thinking_content') THEN
        ALTER TABLE messages 
        -- 512k characters is around 128k tokens
        ADD COLUMN thinking_content TEXT CHECK (char_length(thinking_content) <= 512000);
    END IF;

    -- Add thinking_elapsed_secs column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'messages' AND column_name = 'thinking_elapsed_secs') THEN
        ALTER TABLE messages 
        ADD COLUMN thinking_elapsed_secs INTEGER;
    END IF;
END $$;
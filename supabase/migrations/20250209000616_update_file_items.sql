-- Remove local embedding column and add name column to file_items
ALTER TABLE file_items 
  DROP COLUMN IF EXISTS local_embedding,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Drop local embedding index
DROP INDEX IF EXISTS file_items_local_embedding_idx;

-- Drop local matching function
DROP FUNCTION IF EXISTS match_file_items_local;

-- Add index on name for faster lookups (include NULL values)
CREATE INDEX IF NOT EXISTS file_items_name_idx ON file_items(name) WHERE name IS NOT NULL;
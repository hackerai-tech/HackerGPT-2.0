-- Table: Stores sandbox instances for persistent terminal sessions
CREATE TABLE e2b_sandboxes (
    -- ID
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- REQUIRED
    sandbox_id TEXT NOT NULL,       
    template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pausing', 'paused')),

    -- METADATA        
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMPTZ
);

-- Optimizes lookups for sandbox retrieval
CREATE INDEX idx_e2b_sandboxes_lookup ON e2b_sandboxes (user_id, template, sandbox_id);

-- BRIN index for time-based queries
CREATE INDEX idx_e2b_sandboxes_created_at ON e2b_sandboxes USING BRIN (created_at);

-- Ensures single sandbox per user+template
CREATE UNIQUE INDEX idx_e2b_sandboxes_unique_active 
ON e2b_sandboxes (user_id, template);

-- Updated_at trigger
CREATE TRIGGER update_e2b_sandboxes_updated_at
    BEFORE UPDATE ON e2b_sandboxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Security: Ensures users can only READ their own sandboxes
ALTER TABLE e2b_sandboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow readonly access to own e2b sandboxes"
    ON e2b_sandboxes
    FOR SELECT
    USING (user_id = auth.uid());
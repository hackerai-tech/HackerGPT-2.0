-- Add new columns to the subscriptions table
ALTER TABLE subscriptions
ADD COLUMN plan_type TEXT CHECK (plan_type IN ('pro', 'team')),
ADD COLUMN team_name TEXT,
ADD COLUMN quantity INTEGER DEFAULT 1;

-- Update existing rows to set plan_type to 'pro' (assuming all existing subscriptions are pro)
UPDATE subscriptions SET plan_type = 'pro' WHERE plan_type IS NULL;

-- Make plan_type NOT NULL after updating existing rows
ALTER TABLE subscriptions ALTER COLUMN plan_type SET NOT NULL;
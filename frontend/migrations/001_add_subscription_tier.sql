-- Add subscription_tier column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic';

-- Add index on subscription_tier for better query performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier 
ON users(subscription_tier);

-- Update existing users to have 'basic' tier if they don't have one
UPDATE users 
SET subscription_tier = 'basic' 
WHERE subscription_tier IS NULL;

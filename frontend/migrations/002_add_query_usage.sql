-- Migration: Add query usage tracking for tier limits
-- This table tracks daily query usage per user for enforcing tier limits

-- Create query_usage table
CREATE TABLE IF NOT EXISTS query_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_date DATE NOT NULL DEFAULT CURRENT_DATE,
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, query_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_query_usage_user_date 
ON query_usage(user_id, query_date);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_query_usage_date 
ON query_usage(query_date);

-- Create saved_locations table for location limits
CREATE TABLE IF NOT EXISTS saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name TEXT,
  lat DECIMAL(10, 6) NOT NULL,
  lon DECIMAL(10, 6) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for saved locations
CREATE INDEX IF NOT EXISTS idx_saved_locations_user 
ON saved_locations(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for query_usage
DROP TRIGGER IF EXISTS update_query_usage_updated_at ON query_usage;
CREATE TRIGGER update_query_usage_updated_at
  BEFORE UPDATE ON query_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for saved_locations
DROP TRIGGER IF EXISTS update_saved_locations_updated_at ON saved_locations;
CREATE TRIGGER update_saved_locations_updated_at
  BEFORE UPDATE ON saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment query count (upsert)
CREATE OR REPLACE FUNCTION increment_query_usage(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, query_date DATE) AS $$
DECLARE
  v_count INTEGER;
  v_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO query_usage (user_id, query_date, query_count)
  VALUES (p_user_id, v_date, 1)
  ON CONFLICT (user_id, query_date)
  DO UPDATE SET query_count = query_usage.query_count + 1
  RETURNING query_usage.query_count INTO v_count;
  
  RETURN QUERY SELECT v_count, v_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get current usage for a user
CREATE OR REPLACE FUNCTION get_query_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT query_count INTO v_count
  FROM query_usage
  WHERE user_id = p_user_id AND query_date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Cleanup old usage records (keep last 90 days)
-- Run this periodically via cron job or scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_query_usage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM query_usage
  WHERE query_date < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE query_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own query usage"
  ON query_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert/update their own usage
CREATE POLICY "Users can insert own query usage"
  ON query_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own query usage"
  ON query_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only manage their own saved locations
CREATE POLICY "Users can view own saved locations"
  ON saved_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON saved_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON saved_locations FOR DELETE
  USING (auth.uid() = user_id);


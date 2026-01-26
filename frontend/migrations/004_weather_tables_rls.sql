-- Migration: Add Row Level Security to weather data tables
-- This ensures the weather data is read-only for public users

-- Enable RLS on weather tables
ALTER TABLE weather_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Public read access to weather grid" ON weather_grid;
DROP POLICY IF EXISTS "Public read access to weather forecasts" ON weather_forecasts;

-- Allow anyone to READ weather grid data (but not modify)
CREATE POLICY "Public read access to weather grid"
  ON weather_grid FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to READ weather forecast data (but not modify)
CREATE POLICY "Public read access to weather forecasts"
  ON weather_forecasts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies are created
-- This means only the service role can modify this data
-- The anon key can only read, making it safe to publish

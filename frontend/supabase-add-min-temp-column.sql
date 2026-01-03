-- Add min_temperature column to weather_forecasts table
-- Run this in Supabase SQL Editor

ALTER TABLE weather_forecasts 
ADD COLUMN IF NOT EXISTS min_temperature DOUBLE PRECISION;

-- Create index for min temperature queries
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_min_temp 
  ON weather_forecasts(min_temperature);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weather_forecasts';


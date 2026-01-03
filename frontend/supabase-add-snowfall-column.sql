-- Add snowfall_amount column to weather_forecasts table
-- Run this in Supabase SQL Editor

ALTER TABLE weather_forecasts 
ADD COLUMN IF NOT EXISTS snowfall_amount DOUBLE PRECISION;

-- Create index for snowfall queries
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_snowfall 
  ON weather_forecasts(snowfall_amount);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weather_forecasts'
  AND column_name IN ('avg_temperature', 'max_temperature', 'min_temperature', 'precipitation_sum', 'snowfall_amount');

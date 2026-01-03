-- Add precipitation_sum column to weather_forecasts table
-- Run this in Supabase SQL Editor

ALTER TABLE weather_forecasts 
ADD COLUMN IF NOT EXISTS precipitation_sum DOUBLE PRECISION;

-- Create index for precipitation queries
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_precipitation 
  ON weather_forecasts(precipitation_sum);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weather_forecasts'
  AND column_name IN ('avg_temperature', 'max_temperature', 'min_temperature', 'precipitation_sum');


-- WeatherSight Weather Grid and Forecast Schema
-- Grid coordinates table (one-time load, ~13K rows)
CREATE TABLE weather_grid (
  grid_index INTEGER PRIMARY KEY,
  longitude DOUBLE PRECISION NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for fast location queries
CREATE INDEX idx_weather_grid_location 
  ON weather_grid (latitude, longitude);

-- Daily forecast data (365 rows × 13K columns = ~4.7M records)
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  grid_index INTEGER NOT NULL REFERENCES weather_grid(grid_index),
  day_of_year INTEGER NOT NULL, -- 1-365
  avg_temperature DOUBLE PRECISION NOT NULL,
  forecast_year INTEGER DEFAULT 2025,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grid_index, day_of_year, forecast_year)
);

-- Index for fast queries by location and date
CREATE INDEX idx_weather_forecasts_grid_day 
  ON weather_forecasts(grid_index, day_of_year);

-- Index for querying by day across all locations
CREATE INDEX idx_weather_forecasts_day 
  ON weather_forecasts(day_of_year);

-- Enable Row Level Security
ALTER TABLE weather_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since this is forecast data)
CREATE POLICY "Allow public read access to grid" 
  ON weather_grid FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read access to forecasts" 
  ON weather_forecasts FOR SELECT TO anon, authenticated USING (true);

-- Only authenticated users can insert (for admin seeding)
CREATE POLICY "Allow authenticated insert to grid" 
  ON weather_grid FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to forecasts" 
  ON weather_forecasts FOR INSERT TO authenticated WITH CHECK (true);


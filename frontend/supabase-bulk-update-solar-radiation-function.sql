-- Bulk update RPC function for solar_radiation
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.bulk_update_solar_radiation(
  p_day INTEGER,
  p_grid_indices INTEGER[],
  p_solar_values DOUBLE PRECISION[],
  p_year INTEGER DEFAULT 2025
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF array_length(p_grid_indices, 1) IS DISTINCT FROM array_length(p_solar_values, 1) THEN
    RAISE EXCEPTION 'Array length mismatch: grid_indices=% solar_values=%',
      array_length(p_grid_indices, 1),
      array_length(p_solar_values, 1);
  END IF;

  WITH data AS (
    SELECT
      unnest(p_grid_indices) AS grid_index,
      unnest(p_solar_values) AS solar_radiation
  )
  UPDATE weather_forecasts wf
  SET solar_radiation = data.solar_radiation
  FROM data
  WHERE wf.grid_index = data.grid_index
    AND wf.day_of_year = p_day
    AND wf.forecast_year = p_year
    AND wf.solar_radiation IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_solar_radiation(INTEGER, INTEGER[], DOUBLE PRECISION[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_solar_radiation(INTEGER, INTEGER[], DOUBLE PRECISION[], INTEGER) TO authenticated;

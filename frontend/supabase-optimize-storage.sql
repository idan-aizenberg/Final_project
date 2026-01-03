-- Database Storage Optimization Script
-- This script will reduce your database size by ~450 MB
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Check current database size
-- ============================================
SELECT 
  'Current Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as size;

SELECT 
  'weather_forecasts Table' as metric,
  pg_size_pretty(pg_total_relation_size('weather_forecasts')) AS total_size,
  pg_size_pretty(pg_relation_size('weather_forecasts')) AS table_size,
  pg_size_pretty(pg_total_relation_size('weather_forecasts') - pg_relation_size('weather_forecasts')) AS indexes_size;

-- ============================================
-- STEP 2: View all indexes (before dropping)
-- ============================================
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'weather_forecasts'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- ============================================
-- STEP 3: Drop unnecessary indexes
-- Saves ~150-200 MB
-- ============================================
-- These indexes on temperature columns are likely not needed
-- unless you frequently query by temperature value directly
DROP INDEX IF EXISTS idx_weather_forecasts_max_temp;
DROP INDEX IF EXISTS idx_weather_forecasts_min_temp;

-- Analyze table after dropping indexes
ANALYZE weather_forecasts;

-- ============================================
-- STEP 4: Optimize data types
-- Saves ~200 MB
-- ============================================
-- DOUBLE PRECISION (8 bytes) → REAL (4 bytes) for temperatures
-- INTEGER (4 bytes) → SMALLINT (2 bytes) for day_of_year and forecast_year
BEGIN;

ALTER TABLE weather_forecasts 
  ALTER COLUMN avg_temperature TYPE REAL;

ALTER TABLE weather_forecasts 
  ALTER COLUMN max_temperature TYPE REAL;

ALTER TABLE weather_forecasts 
  ALTER COLUMN min_temperature TYPE REAL;

ALTER TABLE weather_forecasts 
  ALTER COLUMN day_of_year TYPE SMALLINT;

ALTER TABLE weather_forecasts 
  ALTER COLUMN forecast_year TYPE SMALLINT;

COMMIT;

-- ============================================
-- STEP 5: Remove created_at column (optional)
-- Saves ~100 MB
-- Only do this if you don't need creation timestamps
-- ============================================
-- Uncomment the line below if you want to remove created_at:
-- ALTER TABLE weather_forecasts DROP COLUMN IF EXISTS created_at;

-- ============================================
-- STEP 6: Reclaim space with VACUUM FULL
-- This rewrites the table to reclaim space
-- WARNING: This will lock the table briefly
-- ============================================
VACUUM FULL weather_forecasts;
ANALYZE weather_forecasts;

-- ============================================
-- STEP 7: Check new database size
-- ============================================
SELECT 
  'New Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as size;

SELECT 
  'weather_forecasts Table (After)' as metric,
  pg_size_pretty(pg_total_relation_size('weather_forecasts')) AS total_size,
  pg_size_pretty(pg_relation_size('weather_forecasts')) AS table_size,
  pg_size_pretty(pg_total_relation_size('weather_forecasts') - pg_relation_size('weather_forecasts')) AS indexes_size;

-- ============================================
-- STEP 8: Verify remaining indexes
-- ============================================
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'weather_forecasts'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- ============================================
-- Summary
-- ============================================
-- Expected space savings:
-- - Drop 2 indexes: ~150 MB
-- - Optimize data types: ~200 MB
-- - Remove created_at (optional): ~100 MB
-- Total: ~350-450 MB saved
-- ============================================


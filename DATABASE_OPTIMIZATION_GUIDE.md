# Database Size Optimization Guide

## Current Problem
Your 93 MB of CSV data is consuming 500+ MB in Supabase due to:
1. **Normalized storage** (wide CSV → tall database table)
2. **Multiple indexes** (6 indexes total)
3. **PostgreSQL row overhead** (~23-28 bytes per row)
4. **12.7 million records** from just 3 CSV files

## Immediate Solutions

### Option 1: Remove Unnecessary Indexes ⚡ (Fastest - Do This First)

Drop indexes you may not need:

```sql
-- Check current indexes
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'weather_forecasts';

-- Drop the temperature indexes (if you don't query by temperature directly)
DROP INDEX IF EXISTS idx_weather_forecasts_max_temp;
DROP INDEX IF EXISTS idx_weather_forecasts_min_temp;

-- This could save 100-200 MB immediately
```

**Impact:** Could reduce database size by 20-40% (~100-200 MB)

### Option 2: Change Data Types to Use Less Space

```sql
-- Switch from DOUBLE PRECISION (8 bytes) to REAL (4 bytes)
-- Temperature doesn't need 15 decimal places
ALTER TABLE weather_forecasts 
  ALTER COLUMN avg_temperature TYPE REAL,
  ALTER COLUMN max_temperature TYPE REAL,
  ALTER COLUMN min_temperature TYPE REAL;

-- Use SMALLINT for day_of_year (1-365 fits in 2 bytes vs 4)
ALTER TABLE weather_forecasts 
  ALTER COLUMN day_of_year TYPE SMALLINT;

-- Use SMALLINT for forecast_year if you only have a few years
ALTER TABLE weather_forecasts 
  ALTER COLUMN forecast_year TYPE SMALLINT;
```

**Savings per row:** 
- 3 × 4 bytes (REAL vs DOUBLE) = 12 bytes
- 4 bytes (SMALLINT vs INTEGER for day_of_year) = 4 bytes
- Total: ~16 bytes per row

**Impact:** 12.7M rows × 16 bytes = ~200 MB saved

### Option 3: Remove Unused Columns

```sql
-- If you don't need created_at timestamps
ALTER TABLE weather_forecasts DROP COLUMN created_at;

-- Saves 8 bytes per row = 12.7M × 8 = ~100 MB
```

### Option 4: Partition the Data (Advanced)

For large datasets, partition by year to improve query performance and manage data better:

```sql
-- Create partitioned table
CREATE TABLE weather_forecasts_partitioned (
  id BIGSERIAL,
  grid_index INTEGER NOT NULL,
  day_of_year SMALLINT NOT NULL,
  avg_temperature REAL NOT NULL,
  max_temperature REAL,
  min_temperature REAL,
  forecast_year SMALLINT DEFAULT 2025,
  PRIMARY KEY (id, forecast_year)
) PARTITION BY RANGE (forecast_year);

-- Create partitions for each year
CREATE TABLE weather_forecasts_2025 PARTITION OF weather_forecasts_partitioned
  FOR VALUES FROM (2025) TO (2026);

-- Migrate data
INSERT INTO weather_forecasts_partitioned 
  SELECT * FROM weather_forecasts;
```

### Option 5: Archive Old Data

If you have multiple years and only need current year active:

```sql
-- Export old data
COPY (SELECT * FROM weather_forecasts WHERE forecast_year < 2025) 
TO '/tmp/weather_archive_2024.csv' WITH CSV HEADER;

-- Delete archived data
DELETE FROM weather_forecasts WHERE forecast_year < 2025;

-- Reclaim space
VACUUM FULL weather_forecasts;
```

## Long-term Solutions

### Option A: Use PostgreSQL Array Columns (Store Wide Format)

Instead of 13K rows per day, store one row per day with an array:

```sql
CREATE TABLE weather_forecasts_optimized (
  day_of_year SMALLINT PRIMARY KEY,
  forecast_year SMALLINT DEFAULT 2025,
  temperatures REAL[], -- Array of 13K temperatures
  max_temperatures REAL[],
  min_temperatures REAL[]
);

-- This reduces 13K rows → 1 row per day
-- From 4.2M rows per year → just 365 rows per year
-- Massive space savings: ~90% reduction
```

**Trade-offs:**
- ✅ 90%+ space reduction
- ✅ Much faster for "all temperatures on day X" queries
- ❌ Slower for "temperature at grid point Y across all days"
- ❌ Requires code changes to work with arrays

### Option B: Use JSONB Compression

```sql
CREATE TABLE weather_forecasts_json (
  day_of_year SMALLINT,
  forecast_year SMALLINT,
  data JSONB, -- Compressed JSON with all temperatures
  PRIMARY KEY (day_of_year, forecast_year)
);

-- JSONB is automatically compressed by PostgreSQL
-- Can store entire day's data in one row
```

### Option C: Use Time-Series Database Extension (TimescaleDB)

Supabase supports TimescaleDB extension for time-series data:

```sql
-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert to hypertable (optimized for time-series)
SELECT create_hypertable('weather_forecasts', 'day_of_year');

-- Automatic compression and better performance
```

## Recommended Action Plan

### Phase 1: Quick Wins (Do Now) 🚀

1. **Drop unnecessary indexes** (saves ~150 MB):
```sql
DROP INDEX IF EXISTS idx_weather_forecasts_max_temp;
DROP INDEX IF EXISTS idx_weather_forecasts_min_temp;
VACUUM ANALYZE weather_forecasts;
```

2. **Change data types** (saves ~200 MB):
```sql
BEGIN;
ALTER TABLE weather_forecasts 
  ALTER COLUMN avg_temperature TYPE REAL,
  ALTER COLUMN max_temperature TYPE REAL,
  ALTER COLUMN min_temperature TYPE REAL,
  ALTER COLUMN day_of_year TYPE SMALLINT,
  ALTER COLUMN forecast_year TYPE SMALLINT;
COMMIT;

VACUUM FULL weather_forecasts;
```

3. **Remove created_at if not needed** (saves ~100 MB):
```sql
ALTER TABLE weather_forecasts DROP COLUMN IF EXISTS created_at;
VACUUM FULL weather_forecasts;
```

**Total immediate savings: ~450 MB** → Should bring you under 500 MB limit!

### Phase 2: Restructure (Later, if needed)

If you need to add more data in the future, consider restructuring to use array columns or JSONB for better compression.

## How to Monitor Database Size

```sql
-- Check total database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index sizes
SELECT
  indexname,
  tablename,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

## Summary

**Why 93 MB → 500+ MB:**
- CSV stores data efficiently in wide format (one value per cell)
- Database stores each value as a separate row with overhead
- 323 rows in CSV → 4.2 million rows in database (per CSV file)
- Each row has ~75-80 bytes of overhead + indexes
- Multiple indexes multiply the storage cost

**Quick fix:** Drop 2 indexes + change data types + remove timestamp = saves ~450 MB ✅


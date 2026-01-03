/**
 * Transform precipitation CSV from wide format to long format for PostgreSQL COPY
 * Run: node scripts/transformPrecipitationCSV.js
 * 
 * Input: data/data_integr_2025_8.csv (329 days × 12,974 grids)
 * Output: precipitation_long.csv (grid_index, day_of_year, precipitation_sum, forecast_year)
 */

const fs = require('fs');
const path = require('path');

const INPUT_CSV = path.join(__dirname, '..', '..', 'data', 'data_integr_2025_8.csv');
const OUTPUT_CSV = path.join(__dirname, '..', 'precipitation_long.csv');
const OUTPUT_SQL = path.join(__dirname, '..', 'supabase-copy-precipitation.sql');

console.log('🚀 Starting precipitation CSV transformation...\n');
console.log('📁 Input:', INPUT_CSV);
console.log('📁 Output CSV:', OUTPUT_CSV);
console.log('📁 Output SQL:', OUTPUT_SQL);
console.log('');

const startTime = Date.now();

// Read and parse CSV
const content = fs.readFileSync(INPUT_CSV, 'utf-8');
const lines = content.trim().split('\n');

console.log(`📝 Processing ${lines.length - 1} days of data...`);

// Create CSV output stream
const csvStream = fs.createWriteStream(OUTPUT_CSV);
csvStream.write('grid_index,day_of_year,precipitation_sum,forecast_year\n');

let totalRecords = 0;
let lastDayValues = [];

// Process each data line (skip header)
for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  if (!line.trim()) continue;

  const values = line.split(',');
  const dayIndex = parseInt(values[0]); // 0-indexed in CSV
  const dayOfYear = dayIndex + 1; // Convert to 1-indexed

  // Store last day for filling 330-365
  lastDayValues = [];

  // Write records for each grid point
  for (let i = 1; i < values.length; i++) {
    const precip = parseFloat(values[i]);
    if (isNaN(precip)) continue;

    const gridIndex = i - 1; // Grid indices start at 0
    csvStream.write(`${gridIndex},${dayOfYear},${precip},2025\n`);
    totalRecords++;
    
    lastDayValues.push({ gridIndex, precip });
  }

  if (dayOfYear % 50 === 0) {
    console.log(`  ✓ Day ${dayOfYear}: ${totalRecords.toLocaleString()} records written`);
  }
}

const lastDay = lines.length - 1;
console.log(`\n✅ Wrote days 1-${lastDay} (${totalRecords.toLocaleString()} records)`);

// Fill days 330-365 with last day's data (day 329)
if (lastDay < 365 && lastDayValues.length > 0) {
  console.log(`\n🔁 Filling days ${lastDay + 1}-365 with day ${lastDay} values...`);
  
  for (let day = lastDay + 1; day <= 365; day++) {
    for (const { gridIndex, precip } of lastDayValues) {
      csvStream.write(`${gridIndex},${day},${precip},2025\n`);
      totalRecords++;
    }
    
    if (day % 10 === 0 || day === 365) {
      console.log(`  ✓ Filled day ${day}`);
    }
  }
  
  console.log(`✅ Filled ${365 - lastDay} additional days`);
}

csvStream.end();

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n📊 Total records: ${totalRecords.toLocaleString()}`);
console.log(`⏱️  Time: ${elapsed}s\n`);

// Generate SQL file for Supabase
const sqlContent = `-- Upload precipitation data using PostgreSQL COPY
-- This is MUCH faster than individual inserts
-- Run this in Supabase SQL Editor after running the transform script

-- Step 1: Create temporary table
CREATE TEMP TABLE temp_precipitation (
  grid_index INTEGER,
  day_of_year INTEGER,
  precipitation_sum DOUBLE PRECISION,
  forecast_year INTEGER
);

-- Step 2: Load CSV data into temp table
-- IMPORTANT: You need to copy the CSV content and use Supabase's import feature
-- OR use psql command line if you have direct database access:
-- \\copy temp_precipitation FROM '/path/to/precipitation_long.csv' WITH (FORMAT CSV, HEADER);

-- For Supabase Dashboard, you'll need to insert the data differently.
-- Use this approach instead:

-- OPTION A: Use Supabase Table Editor to import precipitation_long.csv into temp_precipitation table

-- OPTION B: Convert CSV to INSERT statements (for smaller datasets)
-- See instructions below

-- Step 3: Bulk update weather_forecasts from temp table
UPDATE weather_forecasts wf
SET precipitation_sum = tp.precipitation_sum
FROM temp_precipitation tp
WHERE wf.grid_index = tp.grid_index
  AND wf.day_of_year = tp.day_of_year
  AND wf.forecast_year = tp.forecast_year;

-- Step 4: Verify update
SELECT 
  COUNT(*) as total_rows,
  COUNT(precipitation_sum) as rows_with_precipitation,
  ROUND((COUNT(precipitation_sum)::numeric / COUNT(*) * 100)::numeric, 2) as coverage_pct
FROM weather_forecasts
WHERE forecast_year = 2025;

-- Step 5: Clean up temp table
DROP TABLE temp_precipitation;


-- ===============================================
-- ALTERNATIVE: Direct Bulk UPDATE (Recommended for Supabase Dashboard)
-- ===============================================
-- Since Supabase SQL Editor doesn't support \\copy, we'll use the bulk RPC approach instead.
-- This approach is almost as fast and works directly in the SQL Editor.

-- First, create this function (if not exists):
CREATE OR REPLACE FUNCTION bulk_update_precipitation(
  p_grid_indices INTEGER[],
  p_days INTEGER[],
  p_precip_values DOUBLE PRECISION[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = 0
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH data AS (
    SELECT
      unnest(p_grid_indices) as grid_index,
      unnest(p_days) as day_of_year,
      unnest(p_precip_values) as precipitation_sum
  )
  UPDATE weather_forecasts wf
  SET precipitation_sum = data.precipitation_sum
  FROM data
  WHERE wf.grid_index = data.grid_index
    AND wf.day_of_year = data.day_of_year
    AND wf.forecast_year = 2025
    AND wf.precipitation_sum IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_update_precipitation(INTEGER[], INTEGER[], DOUBLE PRECISION[]) TO service_role;
GRANT EXECUTE ON FUNCTION bulk_update_precipitation(INTEGER[], INTEGER[], DOUBLE PRECISION[]) TO authenticated;

-- Then run: node scripts/seedPrecipitation.js
-- (I'll create this script for you using the RPC method)
`;

fs.writeFileSync(OUTPUT_SQL, sqlContent);

console.log('📄 Generated files:');
console.log(`   - ${OUTPUT_CSV}`);
console.log(`   - ${OUTPUT_SQL}`);
console.log('');
console.log('📋 Next steps:');
console.log('   1. Run the SQL from supabase-copy-precipitation.sql in Supabase SQL Editor');
console.log('   2. Since Supabase Dashboard doesn\'t support \\copy, use the RPC approach instead');
console.log('   3. I\'ll create a seedPrecipitation.js script for you that uses the bulk RPC');
console.log('');


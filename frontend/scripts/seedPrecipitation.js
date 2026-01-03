/**
 * Upload precipitation_sum data using bulk RPC (fast method)
 * Run with: node scripts/seedPrecipitation.js
 * 
 * Expected time: ~10-15 minutes for 4.7M records
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check which days need precipitation data
 */
async function checkProgress() {
  console.log('🔎 Checking current DB progress...');
  
  const checkDays = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325];
  const missingDays = [];
  
  for (const day of checkDays) {
    const { count: withPrecip } = await supabase
      .from('weather_forecasts')
      .select('*', { count: 'exact', head: true })
      .eq('forecast_year', 2025)
      .eq('day_of_year', day)
      .not('precipitation_sum', 'is', null);
    
    const { count: total } = await supabase
      .from('weather_forecasts')
      .select('*', { count: 'exact', head: true })
      .eq('forecast_year', 2025)
      .eq('day_of_year', day);
    
    console.log(`  checked day ${day}: ${withPrecip || 0}/${total || 0}`);
    
    if ((withPrecip || 0) < (total || 0)) {
      missingDays.push(day);
    }
  }
  
  return missingDays;
}

/**
 * Main upload function
 */
async function uploadPrecipitationData() {
  console.log('🚀 Starting precipitation data upload...\n');
  const startTime = Date.now();

  // Check progress
  const missingDays = await checkProgress();
  
  if (missingDays.length === 0) {
    console.log('\n✅ All sampled days already have precipitation data!');
    console.log('Proceeding with full upload to ensure complete coverage...\n');
  }

  // Read CSV
  const csvPath = path.join(__dirname, '..', '..', 'data', 'data_integr_2025_8.csv');
  console.log(`📁 Reading CSV: ${csvPath}\n`);
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  console.log(`📝 Processing ${lines.length - 1} days of data...\n`);

  let totalUpdated = 0;
  let lastDayValues = [];

  // Process each day
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    const values = line.split(',');
    const dayIndex = parseInt(values[0]);
    const dayOfYear = dayIndex + 1;

    // Build arrays for this day
    const gridIndices = [];
    const precipValues = [];
    lastDayValues = [];

    for (let i = 1; i < values.length; i++) {
      const precip = parseFloat(values[i]);
      if (isNaN(precip)) continue;

      const gridIndex = i - 1;
      gridIndices.push(gridIndex);
      precipValues.push(precip);
      lastDayValues.push({ gridIndex, precip });
    }

    // Call bulk RPC to update this day
    try {
      const { data: result, error } = await supabase.rpc('bulk_update_precipitation', {
        p_day: dayOfYear,
        p_grid_indices: gridIndices,
        p_precip_values: precipValues,
        p_year: 2025
      });

      if (error) {
        console.error(`❌ Error on day ${dayOfYear}:`, error.message);
        continue;
      }

      totalUpdated += result || 0;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✓ day ${dayOfYear}: updated ${result || 0} rows (${elapsed}s elapsed)`);
      
    } catch (err) {
      console.error(`❌ Exception on day ${dayOfYear}:`, err.message);
    }
  }

  const lastDay = lines.length - 1;
  console.log(`\n✅ Uploaded days 1-${lastDay}. Total updated: ${totalUpdated.toLocaleString()}`);

  // Fill days 330-365 if needed
  if (lastDay < 365 && lastDayValues.length > 0) {
    console.log(`\n🔁 Filling days ${lastDay + 1}-365 with day ${lastDay} values...`);
    
    let fillUpdated = 0;
    
    for (let day = lastDay + 1; day <= 365; day++) {
      const gridIndices = lastDayValues.map(v => v.gridIndex);
      const precipValues = lastDayValues.map(v => v.precip);

      try {
        const { data: result, error } = await supabase.rpc('bulk_update_precipitation', {
          p_day: day,
          p_grid_indices: gridIndices,
          p_precip_values: precipValues,
          p_year: 2025
        });

        if (error) {
          console.error(`❌ Error filling day ${day}:`, error.message);
          continue;
        }

        fillUpdated += result || 0;
        
        if (day % 10 === 0 || day === 365) {
          console.log(`  ✓ filled day ${day}: updated ${result || 0} rows`);
        }
        
      } catch (err) {
        console.error(`❌ Exception filling day ${day}:`, err.message);
      }
    }
    
    console.log(`✅ Filled ${365 - lastDay} days with ${fillUpdated.toLocaleString()} records`);
    totalUpdated += fillUpdated;
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log(`\n🎉 Complete! ${totalUpdated.toLocaleString()} total records in ${totalTime} minutes`);
}

// Run the upload
uploadPrecipitationData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


/**
 * Upload wind_speed_v_max data using bulk RPC (fast method)
 * Run with: node scripts/seedWindSpeedV.js
 * 
 * Prerequisites:
 * - Run frontend/supabase-add-wind-speed-v-column.sql
 * - Run frontend/supabase-bulk-update-wind-speed-v-function.sql
 * - .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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
 * Check which days already have wind_speed_v_max data
 */
async function checkProgress() {
  console.log('🔎 Checking current DB progress for wind_speed_v_max...');
  
  const checkDays = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325];
  const missingDays = [];
  
  for (const day of checkDays) {
    const { count: withWindV } = await supabase
      .from('weather_forecasts')
      .select('*', { count: 'exact', head: true })
      .eq('forecast_year', 2025)
      .eq('day_of_year', day)
      .not('wind_speed_v_max', 'is', null);
    
    const { count: total } = await supabase
      .from('weather_forecasts')
      .select('*', { count: 'exact', head: true })
      .eq('forecast_year', 2025)
      .eq('day_of_year', day);
    
    console.log(`  checked day ${day}: ${withWindV || 0}/${total || 0}`);
    
    if ((withWindV || 0) < (total || 0)) {
      missingDays.push(day);
    }
  }
  
  return missingDays;
}

/**
 * Main upload function
 */
async function uploadWindSpeedVData() {
  console.log('🚀 Starting wind_speed_v_max data upload...\n');
  const startTime = Date.now();

  const START_DAY = parseInt(process.env.START_DAY || '1', 10);
  const MAX_DAY = parseInt(process.env.MAX_DAY || '365', 10);
  if (START_DAY > 1) {
    console.log(`⏩ Skipping days before ${START_DAY} (set via START_DAY env)`);
  }
  if (MAX_DAY < 365) {
    console.log(`⏹️ Limiting processing to day ${MAX_DAY} (set via MAX_DAY env)`);
  }

  // Check progress
  const missingDays = await checkProgress();
  
  if (missingDays.length === 0) {
    console.log('\n✅ All sampled days already have wind_speed_v_max data!');
    console.log('Proceeding with full upload to ensure complete coverage...\n');
  }

  // Read CSV - data_integr_2025_17.csv contains wind_speed_v_MAX
  const csvPath = path.join(__dirname, '..', '..', 'data', 'data_integr_2025_17.csv');
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

    if (dayOfYear < START_DAY) continue;
    if (dayOfYear > MAX_DAY) {
      console.log(`🛑 Reached MAX_DAY ${MAX_DAY}, stopping early`);
      break;
    }

    // Build arrays for this day
    const gridIndices = [];
    const windVValues = [];
    lastDayValues = [];

    for (let i = 1; i < values.length; i++) {
      const windV = parseFloat(values[i]);
      if (isNaN(windV)) continue;

      const gridIndex = i - 1;
      gridIndices.push(gridIndex);
      windVValues.push(windV);
      lastDayValues.push({ gridIndex, windV });
    }

    // Call bulk RPC to update this day
    const runUpdate = async () => {
      return supabase.rpc('bulk_update_wind_speed_v', {
        p_day: dayOfYear,
        p_grid_indices: gridIndices,
        p_wind_v_values: windVValues,
        p_year: 2025
      });
    };

    try {
      let { data: result, error } = await runUpdate();
      if (error) {
        console.warn(`⚠️ Day ${dayOfYear} failed, retrying once: ${error.message}`);
        await new Promise((r) => setTimeout(r, 1000));
        ({ data: result, error } = await runUpdate());
        if (error) {
          console.error(`❌ Error on day ${dayOfYear}:`, error.message);
          continue;
        }
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
      const windVValues = lastDayValues.map(v => v.windV);

      try {
        const { data: result, error } = await supabase.rpc('bulk_update_wind_speed_v', {
          p_day: day,
          p_grid_indices: gridIndices,
          p_wind_v_values: windVValues,
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
  console.log(`\n🎉 Complete! Total records updated: ${totalUpdated.toLocaleString()}`);
  console.log(`⏱️ Total time: ${totalTime} minutes`);
}

// Run
uploadWindSpeedVData().catch(console.error);

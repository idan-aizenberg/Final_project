/**
 * Resume/Force upload wind_speed_v_max data from a specific day
 * Run with: node scripts/seedWindSpeedVResume.js
 * 
 * This script uses the _force version of the RPC that overwrites existing values
 * 
 * Configuration:
 * - START_DAY: Day to start from (default: 163)
 * - MAX_DAY: Day to end at (default: 365)
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

// Configuration - start from day 163
const START_DAY = parseInt(process.env.START_DAY || '163', 10);
const MAX_DAY = parseInt(process.env.MAX_DAY || '365', 10);

/**
 * Check wind_speed_v_max data status for specific days
 */
async function checkDayStatus(days) {
  console.log('🔎 Checking wind_speed_v_max status for specified days...\n');
  
  for (const day of days) {
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
    
    const status = (withWindV || 0) === (total || 0) ? '✅' : '❌';
    console.log(`  ${status} Day ${day}: ${withWindV || 0}/${total || 0} rows have wind_speed_v_max`);
  }
  console.log('');
}

/**
 * Main upload function - uses force update (overwrites existing)
 */
async function uploadWindSpeedVData() {
  console.log('🚀 Starting wind_speed_v_max FORCE upload...');
  console.log(`📅 Processing days ${START_DAY} to ${MAX_DAY}\n`);
  
  const startTime = Date.now();

  // Check status before
  await checkDayStatus([163, 200, 250, 300, 350, 365]);

  // Read CSV - data_integr_2025_17.csv contains wind_speed_v_MAX
  const csvPath = path.join(__dirname, '..', '..', 'data', 'data_integr_2025_17.csv');
  console.log(`📁 Reading CSV: ${csvPath}\n`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const totalDays = lines.length - 1;
  console.log(`📝 CSV has ${totalDays} days of data\n`);

  let totalUpdated = 0;
  let lastDayValues = [];
  let lastValidDayInCSV = 0;

  // Process each day from CSV
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    const values = line.split(',');
    const dayIndex = parseInt(values[0]);
    const dayOfYear = dayIndex + 1;

    // Track last valid day in CSV
    lastValidDayInCSV = Math.max(lastValidDayInCSV, dayOfYear);

    if (dayOfYear < START_DAY) continue;
    if (dayOfYear > MAX_DAY) {
      console.log(`🛑 Reached MAX_DAY ${MAX_DAY}, stopping`);
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

    // Call bulk RPC FORCE version (overwrites existing values)
    const runUpdate = async () => {
      return supabase.rpc('bulk_update_wind_speed_v_force', {
        p_day: dayOfYear,
        p_grid_indices: gridIndices,
        p_wind_v_values: windVValues,
        p_year: 2025
      });
    };

    try {
      let { data: result, error } = await runUpdate();
      
      if (error) {
        console.warn(`⚠️ Day ${dayOfYear} failed, retrying: ${error.message}`);
        await new Promise((r) => setTimeout(r, 1000));
        ({ data: result, error } = await runUpdate());
        
        if (error) {
          console.error(`❌ Error on day ${dayOfYear}:`, error.message);
          continue;
        }
      }

      totalUpdated += result || 0;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const progress = (((dayOfYear - START_DAY + 1) / (MAX_DAY - START_DAY + 1)) * 100).toFixed(0);
      console.log(`  ✓ day ${dayOfYear}: updated ${result || 0} rows [${progress}%] (${elapsed}s)`);
      
    } catch (err) {
      console.error(`❌ Exception on day ${dayOfYear}:`, err.message);
    }
  }

  console.log(`\n✅ Processed CSV data. Total updated: ${totalUpdated.toLocaleString()}`);

  // Fill remaining days if CSV doesn't have all 365 days
  if (lastValidDayInCSV < MAX_DAY && lastDayValues.length > 0) {
    console.log(`\n🔁 Filling days ${lastValidDayInCSV + 1}-${MAX_DAY} with day ${lastValidDayInCSV} values...`);
    
    let fillUpdated = 0;
    
    for (let day = lastValidDayInCSV + 1; day <= MAX_DAY; day++) {
      const gridIndices = lastDayValues.map(v => v.gridIndex);
      const windVValues = lastDayValues.map(v => v.windV);

      try {
        const { data: result, error } = await supabase.rpc('bulk_update_wind_speed_v_force', {
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
        
        if (day % 10 === 0 || day === MAX_DAY) {
          console.log(`  ✓ filled day ${day}: updated ${result || 0} rows`);
        }
        
      } catch (err) {
        console.error(`❌ Exception filling day ${day}:`, err.message);
      }
    }
    
    console.log(`✅ Filled ${MAX_DAY - lastValidDayInCSV} days with ${fillUpdated.toLocaleString()} records`);
    totalUpdated += fillUpdated;
  }

  // Check status after
  console.log('\n📊 Final status check:');
  await checkDayStatus([163, 200, 250, 300, 350, 365]);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log(`🎉 Complete! Total records updated: ${totalUpdated.toLocaleString()}`);
  console.log(`⏱️ Total time: ${totalTime} minutes`);
}

// Run
uploadWindSpeedVData().catch(console.error);

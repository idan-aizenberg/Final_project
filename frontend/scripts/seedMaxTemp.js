/**
 * Direct script to seed max temperature data
 * Run with: node scripts/seedMaxTemp.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Update max_temperature for existing forecast records
 * Uses UPDATE (not UPSERT) to avoid NOT NULL constraint issues
 */
async function updateMaxTempBatch(records) {
  // Process records in parallel with limited concurrency
  const CONCURRENT_LIMIT = 50;
  
  for (let i = 0; i < records.length; i += CONCURRENT_LIMIT) {
    const batch = records.slice(i, i + CONCURRENT_LIMIT);
    
    await Promise.all(batch.map(async (record) => {
      const { error } = await supabase
        .from('weather_forecasts')
        .update({ max_temperature: record.max_temperature })
        .eq('grid_index', record.grid_index)
        .eq('day_of_year', record.day_of_year)
        .eq('forecast_year', record.forecast_year);
      
      if (error) {
        console.error(`❌ Error updating grid ${record.grid_index}, day ${record.day_of_year}:`, error.message);
      }
    }));
  }
}

async function loadMaxTemperatureData() {
  console.log('🚀 Starting max temperature data seeding...\n');

  // Step 1: Load grid map from database (with pagination)
  console.log('📊 Loading grid coordinates from database...');
  
  const BATCH_SIZE = 1000;
  let allGridData = [];
  let currentBatch = 0;
  let hasMore = true;

  while (hasMore) {
    const start = currentBatch * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;
    
    const { data: batchData, error: gridError } = await supabase
      .from('weather_grid')
      .select('grid_index, longitude, latitude')
      .order('grid_index')
      .range(start, end);

    if (gridError) {
      console.error('❌ Error fetching grid data:', gridError);
      process.exit(1);
    }

    if (!batchData || batchData.length === 0) {
      hasMore = false;
    } else {
      allGridData = allGridData.concat(batchData);
      console.log(`  ✓ Loaded batch ${currentBatch + 1}: ${batchData.length} points (total: ${allGridData.length})`);
      
      if (batchData.length < BATCH_SIZE) {
        hasMore = false;
      }
      currentBatch++;
    }
  }

  if (allGridData.length === 0) {
    console.error('❌ No grid data found. Please run initial seed first.');
    process.exit(1);
  }

  const gridMap = new Map();
  allGridData.forEach((point) => {
    gridMap.set(point.grid_index, {
      lon: point.longitude,
      lat: point.latitude,
    });
  });

  console.log(`✅ Loaded ${gridMap.size} grid points\n`);

  // Step 2: Load max temperature CSV file
  const csvPath = path.join(__dirname, '..', '..', 'data', 'data_integr_2025_12.csv');
  console.log(`📁 Reading max temperature data from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const updateRecords = [];
  let dayOfYear = 1;
  let lastDayData = [];
  let totalUpdated = 0;

  const gridIndices = Array.from(gridMap.keys()).sort((a, b) => a - b);

  console.log('📝 Processing CSV data...\n');

  for await (const line of rl) {
    if (!line.trim()) continue;

    const values = line.trim().split(',');
    lastDayData = values.map(v => parseFloat(v));

    for (let i = 0; i < values.length && i < gridIndices.length; i++) {
      const temperature = parseFloat(values[i]);
      if (isNaN(temperature)) continue;

      updateRecords.push({
        grid_index: gridIndices[i],
        day_of_year: dayOfYear,
        max_temperature: temperature,
        forecast_year: 2025,
      });

      // Batch update every 500 records (smaller batches for reliability)
      if (updateRecords.length >= 500) {
        await updateMaxTempBatch(updateRecords);
        totalUpdated += updateRecords.length;
        console.log(`  ✓ Updated ${totalUpdated.toLocaleString()} records (Day ${dayOfYear})`);
        updateRecords.length = 0;
      }
    }

    dayOfYear++;
  }

  // Update remaining records
  if (updateRecords.length > 0) {
    await updateMaxTempBatch(updateRecords);
    totalUpdated += updateRecords.length;
    console.log(`  ✓ Updated ${totalUpdated.toLocaleString()} records (Day ${dayOfYear - 1})`);
  }

  const lastDay = dayOfYear - 1;
  console.log(`\n✅ Loaded ${lastDay} days of max temperature data`);

  // Step 3: Fill missing days (if needed)
  if (lastDay < 365) {
    console.log(`\n📝 Filling missing days from ${lastDay + 1} to 365...`);
    
    const fillRecords = [];
    let fillUpdated = 0;

    for (let day = lastDay + 1; day <= 365; day++) {
      for (let i = 0; i < lastDayData.length && i < gridIndices.length; i++) {
        const temperature = lastDayData[i];
        if (isNaN(temperature)) continue;

        fillRecords.push({
          grid_index: gridIndices[i],
          day_of_year: day,
          max_temperature: temperature,
          forecast_year: 2025,
        });

        if (fillRecords.length >= 500) {
          await updateMaxTempBatch(fillRecords);
          fillUpdated += fillRecords.length;
          console.log(`  ✓ Filled ${fillUpdated.toLocaleString()} records (Day ${day})`);
          fillRecords.length = 0;
        }
      }
    }

    // Update remaining fill records
    if (fillRecords.length > 0) {
      await updateMaxTempBatch(fillRecords);
      fillUpdated += fillRecords.length;
      console.log(`  ✓ Filled ${fillUpdated.toLocaleString()} records (Day 365)`);
    }

    console.log(`\n✅ Filled ${365 - lastDay} missing days with ${fillUpdated.toLocaleString()} records`);
  }

  console.log('\n🎉 Max temperature data seeding completed successfully!');
  console.log(`📊 Total records updated: ${(totalUpdated + (lastDay < 365 ? (365 - lastDay) * gridIndices.length : 0)).toLocaleString()}`);
}

// Run the seeding
loadMaxTemperatureData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


/**
 * Fast min-temperature uploader with resume support.
 *
 * Requirements:
 * - Run `frontend/supabase-bulk-update-min-temp-function.sql` once in Supabase SQL Editor
 * - Ensure `.env.local` contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does:
 * - Checks which days already have full `min_temperature` coverage
 * - Uploads only missing/partial days from `data/data_integr_2025_13.csv`
 * - Fills days 324-365 by repeating day 323 (same approach we used for other datasets)
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = path.join(__dirname, "..", "..", "data", "data_integr_2025_13.csv");
const FORECAST_YEAR = 2025;
const GRID_MIN = 0;
const GRID_MAX = 12973;
const GRID_COUNT = GRID_MAX - GRID_MIN + 1; // 12974

// Tuneable: payload size vs call count
const CHUNK_SIZE = 1000; // smaller chunks to avoid statement timeouts

function buildGridChunks() {
  const chunks = [];
  for (let start = GRID_MIN; start <= GRID_MAX; start += CHUNK_SIZE) {
    const end = Math.min(GRID_MAX, start + CHUNK_SIZE - 1);
    const arr = new Array(end - start + 1);
    for (let i = 0; i < arr.length; i++) arr[i] = start + i;
    chunks.push(arr);
  }
  return chunks;
}

async function countMinForDay(day) {
  const total = await supabase
    .from("weather_forecasts")
    .select("*", { count: "exact", head: true })
    .eq("forecast_year", FORECAST_YEAR)
    .eq("day_of_year", day);
  if (total.error) throw total.error;

  const r = await supabase
    .from("weather_forecasts")
    .select("*", { count: "exact", head: true })
    .eq("forecast_year", FORECAST_YEAR)
    .eq("day_of_year", day)
    .not("min_temperature", "is", null);

  if (r.error) throw r.error;
  return { total: total.count || 0, withMin: r.count || 0 };
}

async function bulkUpdateDay(day, tempsByGridIndex) {
  // tempsByGridIndex: array length GRID_COUNT where index i => grid_index i
  let updatedTotal = 0;
  const gridChunks = buildGridChunks();

  for (const gridChunk of gridChunks) {
    const tempsChunk = [];
    const effectiveGridChunk = [];

    for (const gridIndex of gridChunk) {
      const temp = tempsByGridIndex[gridIndex];
      // Skip missing/NaN (shouldn't happen, but keeps arrays aligned and avoids writing nulls)
      if (typeof temp !== "number" || Number.isNaN(temp)) continue;
      effectiveGridChunk.push(gridIndex);
      tempsChunk.push(temp);
    }

    if (effectiveGridChunk.length === 0) continue;

    const { data, error } = await supabase.rpc("bulk_update_min_temperature", {
      p_day: day,
      p_grid_indices: effectiveGridChunk,
      p_min_temperatures: tempsChunk,
      p_year: FORECAST_YEAR,
    });

    if (error) throw error;
    updatedTotal += data || 0;
  }

  return updatedTotal;
}

async function main() {
  console.log("🚀 Resume min_temperature upload (RPC bulk updater)");

  // Figure out which days are done
  console.log("🔎 Checking current DB progress...");
  const dayStatus = new Map(); // day -> count
  for (let day = 1; day <= 323; day++) {
    // eslint-disable-next-line no-await-in-loop
    const c = await countMinForDay(day);
    dayStatus.set(day, c);
    if (day % 25 === 0) console.log(`  checked day ${day}: ${c.withMin}/${GRID_COUNT} (rows exist: ${c.total})`);
  }

  const missingDays = [];
  for (let day = 1; day <= 323; day++) {
    const c = dayStatus.get(day) || { total: 0, withMin: 0 };
    // If the base forecast rows don't exist for this day, we can't update min_temperature.
    // (This dataset appears to start at day 2; day 1 has 0 base rows.)
    if (c.total === 0) continue;
    if (c.withMin < GRID_COUNT) missingDays.push({ day, have: c.withMin });
  }

  if (missingDays.length === 0) {
    console.log("✅ Days 1-323 already fully populated. (No upload needed for CSV range)");
  } else {
    console.log(`🧩 Missing/partial days in 1-323: ${missingDays.length}`);
    console.log(
      `   First few: ${missingDays.slice(0, 8).map((d) => `day${d.day}(${d.have})`).join(", ")}`
    );
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  // Stream CSV and only process needed days
  console.log(`📁 Reading CSV: ${CSV_PATH}`);
  const needDay = new Set(missingDays.map((d) => d.day));
  const tempsForDay323 = new Array(GRID_COUNT);

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let processedDays = 0;
  const startedAt = Date.now();

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const values = line.split(",");
    const rowIndex = parseInt(values[0], 10);
    if (Number.isNaN(rowIndex)) continue;

    const dayOfYear = rowIndex + 1; // CSV rows are 0..322 => days 1..323
    if (dayOfYear < 1 || dayOfYear > 323) continue;

    // Build temperatures array for this day (index = grid_index)
    const temps = new Array(GRID_COUNT);
    const maxCols = Math.min(GRID_COUNT, values.length - 1);
    for (let i = 0; i < maxCols; i++) {
      const v = values[i + 1];
      const t = parseFloat(v);
      if (!Number.isNaN(t)) temps[i] = t;
    }

    if (dayOfYear === 323) {
      for (let i = 0; i < GRID_COUNT; i++) tempsForDay323[i] = temps[i];
    }

    if (!needDay.has(dayOfYear)) continue;

    // eslint-disable-next-line no-await-in-loop
    const updated = await bulkUpdateDay(dayOfYear, temps);
    processedDays++;

    const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`  ✓ day ${dayOfYear}: updated ${updated} rows (${elapsedS}s elapsed)`);
  }

  console.log(`✅ Uploaded missing days in 1-323. Processed days: ${processedDays}`);

  // Fill 324-365 using day 323 (if needed)
  console.log("🔁 Checking fill for days 324-365...");
  const c323 = await countMinForDay(323);
  if (c323.total === 0 || c323.withMin < GRID_COUNT) {
    console.log(
      `⚠️ Day 323 isn't fully filled yet (${c323.withMin}/${GRID_COUNT}, rows exist: ${c323.total}). Skipping fill for 324-365.`
    );
    return;
  }

  // Ensure we actually have day323 temps from CSV
  const hasDay323Temps = tempsForDay323.some((t) => typeof t === "number" && !Number.isNaN(t));
  if (!hasDay323Temps) {
    console.log("⚠️ Could not capture day 323 values from CSV stream. Skipping fill for 324-365.");
    return;
  }

  let filledDays = 0;
  for (let day = 324; day <= 365; day++) {
    // eslint-disable-next-line no-await-in-loop
    const c = await countMinForDay(day);
    if (c.total === 0) continue;
    if (c.withMin >= GRID_COUNT) continue;
    // eslint-disable-next-line no-await-in-loop
    const updated = await bulkUpdateDay(day, tempsForDay323);
    filledDays++;
    console.log(`  ✓ filled day ${day}: updated ${updated} rows`);
  }

  console.log(`🎉 Done. Filled days 324-365: ${filledDays}`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});



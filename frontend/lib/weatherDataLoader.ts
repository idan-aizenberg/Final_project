import fs from 'fs';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

interface GridPoint {
  grid_index: number;
  longitude: number;
  latitude: number;
}

interface ForecastRecord {
  grid_index: number;
  day_of_year: number;
  avg_temperature: number;
  max_temperature?: number;
  forecast_year: number;
}

export class WeatherDataLoader {
  private supabase;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Load grid coordinates from greed_coord.dat file
   * Format: grid_index, row, col, longitude, latitude (tab/space separated)
   */
  async loadGridCoordinates(filePath: string): Promise<Map<number, { lon: number; lat: number }>> {
    console.log('Loading grid coordinates from:', filePath);
    const gridMap = new Map<number, { lon: number; lat: number }>();
    const gridPoints: GridPoint[] = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;

      // Split by tabs or multiple spaces
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;

      const gridIndex = parseInt(parts[0]);
      const longitude = parseFloat(parts[3]);
      const latitude = parseFloat(parts[4]);

      if (isNaN(gridIndex) || isNaN(longitude) || isNaN(latitude)) {
        console.warn(`Invalid data at line ${lineCount}: ${line}`);
        continue;
      }

      gridMap.set(gridIndex, { lon: longitude, lat: latitude });
      gridPoints.push({
        grid_index: gridIndex,
        longitude,
        latitude,
      });

      lineCount++;

      // Batch insert every 1000 records
      if (gridPoints.length >= 1000) {
        await this.insertGridBatch(gridPoints);
        gridPoints.length = 0;
      }
    }

    // Insert remaining records
    if (gridPoints.length > 0) {
      await this.insertGridBatch(gridPoints);
    }

    console.log(`Loaded ${gridMap.size} grid points`);
    return gridMap;
  }

  /**
   * Batch insert grid coordinates (upsert to handle duplicates)
   */
  private async insertGridBatch(gridPoints: GridPoint[]): Promise<void> {
    const { error } = await this.supabase
      .from('weather_grid')
      .upsert(gridPoints, { onConflict: 'grid_index' });

    if (error) {
      console.error('Error inserting grid batch:', error);
      throw error;
    }
  }

  /**
   * Load forecast data from CSV file
   * Each row = day of year, each column = grid index
   */
  async loadForecastData(
    filePath: string,
    gridMap: Map<number, { lon: number; lat: number }>
  ): Promise<number> {
    console.log('Loading forecast data from:', filePath);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const forecastRecords: ForecastRecord[] = [];
    let dayOfYear = 1;
    let lastDayData: number[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      // Split by comma (CSV format)
      const values = line.trim().split(',');

      // Store last day data for filling missing days
      lastDayData = values.map(v => parseFloat(v));

      // Create forecast records for each grid point
      const gridIndices = Array.from(gridMap.keys()).sort((a, b) => a - b);

      for (let i = 0; i < values.length && i < gridIndices.length; i++) {
        const temperature = parseFloat(values[i]);
        if (isNaN(temperature)) continue;

        forecastRecords.push({
          grid_index: gridIndices[i],
          day_of_year: dayOfYear,
          avg_temperature: temperature,
          forecast_year: 2025,
        });

        // Batch insert every 5000 records
        if (forecastRecords.length >= 5000) {
          await this.insertForecastBatch(forecastRecords);
          forecastRecords.length = 0;
        }
      }

      dayOfYear++;
    }

    // Insert remaining records
    if (forecastRecords.length > 0) {
      await this.insertForecastBatch(forecastRecords);
    }

    const lastDay = dayOfYear - 1;
    console.log(`Loaded ${lastDay} days of forecast data`);

    // Fill missing days if needed
    if (lastDay < 365) {
      await this.fillMissingDays(lastDayData, lastDay, gridMap);
    }

    return lastDay;
  }

  /**
   * Load max temperature forecast data from CSV file and update existing records
   * Each row = day of year, each column = grid index
   */
  async loadMaxForecastData(
    filePath: string,
    gridMap: Map<number, { lon: number; lat: number }>
  ): Promise<number> {
    console.log('Loading max temperature forecast data from:', filePath);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const updateRecords: { grid_index: number; day_of_year: number; max_temperature: number; forecast_year: number }[] = [];
    let dayOfYear = 1;
    let lastDayData: number[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      // Split by comma (CSV format)
      const values = line.trim().split(',');

      // Store last day data for filling missing days
      lastDayData = values.map(v => parseFloat(v));

      // Create update records for each grid point
      const gridIndices = Array.from(gridMap.keys()).sort((a, b) => a - b);

      for (let i = 0; i < values.length && i < gridIndices.length; i++) {
        const temperature = parseFloat(values[i]);
        if (isNaN(temperature)) continue;

        updateRecords.push({
          grid_index: gridIndices[i],
          day_of_year: dayOfYear,
          max_temperature: temperature,
          forecast_year: 2025,
        });

        // Batch update every 5000 records
        if (updateRecords.length >= 5000) {
          await this.updateMaxTemperatureBatch(updateRecords);
          updateRecords.length = 0;
        }
      }

      dayOfYear++;
    }

    // Update remaining records
    if (updateRecords.length > 0) {
      await this.updateMaxTemperatureBatch(updateRecords);
    }

    const lastDay = dayOfYear - 1;
    console.log(`Loaded ${lastDay} days of max temperature forecast data`);

    // Fill missing days if needed
    if (lastDay < 365) {
      await this.fillMissingMaxDays(lastDayData, lastDay, gridMap);
    }

    return lastDay;
  }

  /**
   * Batch insert forecast records
   */
  private async insertForecastBatch(records: ForecastRecord[]): Promise<void> {
    const { error } = await this.supabase
      .from('weather_forecasts')
      .upsert(records, { onConflict: 'grid_index,day_of_year,forecast_year' });

    if (error) {
      console.error('Error inserting forecast batch:', error);
      throw error;
    }

    console.log(`Inserted ${records.length} forecast records`);
  }

  /**
   * Batch update max temperature for existing forecast records
   */
  private async updateMaxTemperatureBatch(records: { grid_index: number; day_of_year: number; max_temperature: number; forecast_year: number }[]): Promise<void> {
    const { error } = await this.supabase
      .from('weather_forecasts')
      .upsert(records, { onConflict: 'grid_index,day_of_year,forecast_year' });

    if (error) {
      console.error('Error updating max temperature batch:', error);
      throw error;
    }

    console.log(`Updated ${records.length} records with max temperature`);
  }

  /**
   * Fill missing days (15-365) with last available day's data
   */
  async fillMissingDays(
    lastDayData: number[],
    lastDay: number,
    gridMap: Map<number, { lon: number; lat: number }>
  ): Promise<void> {
    console.log(`Filling missing days from ${lastDay + 1} to 365...`);

    const gridIndices = Array.from(gridMap.keys()).sort((a, b) => a - b);
    const forecastRecords: ForecastRecord[] = [];

    for (let day = lastDay + 1; day <= 365; day++) {
      for (let i = 0; i < lastDayData.length && i < gridIndices.length; i++) {
        const temperature = lastDayData[i];
        if (isNaN(temperature)) continue;

        forecastRecords.push({
          grid_index: gridIndices[i],
          day_of_year: day,
          avg_temperature: temperature,
          forecast_year: 2025,
        });

        // Batch insert every 5000 records
        if (forecastRecords.length >= 5000) {
          await this.insertForecastBatch(forecastRecords);
          forecastRecords.length = 0;
        }
      }
    }

    // Insert remaining records
    if (forecastRecords.length > 0) {
      await this.insertForecastBatch(forecastRecords);
    }

    console.log(`Filled ${365 - lastDay} missing days`);
  }

  /**
   * Fill missing days for max temperature with last available day's data
   */
  async fillMissingMaxDays(
    lastDayData: number[],
    lastDay: number,
    gridMap: Map<number, { lon: number; lat: number }>
  ): Promise<void> {
    console.log(`Filling missing max temperature days from ${lastDay + 1} to 365...`);

    const gridIndices = Array.from(gridMap.keys()).sort((a, b) => a - b);
    const updateRecords: { grid_index: number; day_of_year: number; max_temperature: number; forecast_year: number }[] = [];

    for (let day = lastDay + 1; day <= 365; day++) {
      for (let i = 0; i < lastDayData.length && i < gridIndices.length; i++) {
        const temperature = lastDayData[i];
        if (isNaN(temperature)) continue;

        updateRecords.push({
          grid_index: gridIndices[i],
          day_of_year: day,
          max_temperature: temperature,
          forecast_year: 2025,
        });

        // Batch update every 5000 records
        if (updateRecords.length >= 5000) {
          await this.updateMaxTemperatureBatch(updateRecords);
          updateRecords.length = 0;
        }
      }
    }

    // Update remaining records
    if (updateRecords.length > 0) {
      await this.updateMaxTemperatureBatch(updateRecords);
    }

    console.log(`Filled ${365 - lastDay} missing max temperature days`);
  }
}


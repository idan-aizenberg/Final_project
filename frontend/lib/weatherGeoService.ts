const kdTree = require('kd-tree-javascript').kdTree;
import { createClient } from '@supabase/supabase-js';

interface GridPoint {
  gridIndex: number;
  lat: number;
  lon: number;
}

interface WeatherQuery {
  lat: number;
  lon: number;
  dayOfYear?: number;
}

interface WeatherResult {
  gridIndex: number;
  location: { lat: number; lon: number };
  distance: number;
  temperature: number;
  maxTemperature?: number;
  minTemperature?: number;
  precipitationSum?: number;
  snowfallAmount?: number;
  solarRadiation?: number;
  dayOfYear: number;
  nearestPointDistance: number;
}

interface TempRange {
  min: number;
  max: number;
}

/**
 * Haversine distance formula to calculate distance between two points on Earth
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert geographic coordinates to 3D Cartesian coordinates
 * This allows KD-tree to work correctly with spherical geometry
 */
function latLonToCartesian(lat: number, lon: number): { x: number; y: number; z: number } {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  
  return {
    x: Math.cos(latRad) * Math.cos(lonRad),
    y: Math.cos(latRad) * Math.sin(lonRad),
    z: Math.sin(latRad),
  };
}

/**
 * Euclidean distance in 3D Cartesian space
 * For points on unit sphere, chord distance approximates great-circle distance
 */
function cartesianDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * WeatherGeoService - In-memory KD-tree for fast location queries
 */
export class WeatherGeoService {
  private kdTree: any = null;
  private gridPoints: Map<number, GridPoint> = new Map();
  private initialized: boolean = false;
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Configure client to allow fetching all grid points (default maxRows is 1000)
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Prefer': 'return=representation',
        },
      },
    });
  }

  /**
   * Initialize the service by loading grid points and building KD-tree
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing WeatherGeoService...');

    // Load all grid points from database in batches (Supabase limits single queries to 1000 rows)
    const BATCH_SIZE = 1000;
    let allGridData: any[] = [];
    let currentBatch = 0;
    let hasMore = true;

    while (hasMore) {
      const start = currentBatch * BATCH_SIZE;
      const end = start + BATCH_SIZE - 1;
      
      const { data: batchData, error } = await this.supabase
        .from('weather_grid')
        .select('grid_index, latitude, longitude')
        .order('grid_index')
        .range(start, end);

      if (error) {
        console.error('Error loading grid points batch:', error);
        throw new Error('Failed to load grid points from database');
      }

      if (!batchData || batchData.length === 0) {
        hasMore = false;
      } else {
        allGridData = allGridData.concat(batchData);
        console.log(`Loaded batch ${currentBatch + 1}: ${batchData.length} points (total so far: ${allGridData.length})`);
        
        if (batchData.length < BATCH_SIZE) {
          hasMore = false; // Last batch
        }
        currentBatch++;
      }
    }

    const gridData = allGridData;
    
    if (!gridData || gridData.length === 0) {
      throw new Error('No grid points found in database');
    }
    
    console.log(`Total loaded: ${gridData.length} grid points from database`);

    // Store grid points in Map for O(1) lookup
    const pointsForTree: Array<{ x: number; y: number; z: number; gridIndex: number; lat: number; lon: number }> = [];

    for (const point of gridData) {
      const gridPoint: GridPoint = {
        gridIndex: point.grid_index,
        lat: point.latitude,
        lon: point.longitude,
      };

      this.gridPoints.set(point.grid_index, gridPoint);
      
      // Convert to 3D Cartesian coordinates for tree building
      const cartesian = latLonToCartesian(point.latitude, point.longitude);
      pointsForTree.push({
        x: cartesian.x,
        y: cartesian.y,
        z: cartesian.z,
        gridIndex: point.grid_index,
        lat: point.latitude,
        lon: point.longitude,
      });
    }

    // Build KD-Tree using 3D Cartesian coordinates and Euclidean distance
    this.kdTree = new kdTree(pointsForTree, cartesianDistance, ['x', 'y', 'z']);

    this.initialized = true;
    console.log(`WeatherGeoService initialized with ${this.gridPoints.size} grid points using 3D Cartesian coordinates (x, y, z)`);
  }

  /**
   * Get weather forecast for a specific location and day
   */
  async getWeatherByLocation(query: WeatherQuery): Promise<WeatherResult> {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call init() first.');
    }

    const { lat, lon, dayOfYear = getCurrentDayOfYear() } = query;

    // Convert query coordinates to 3D Cartesian for tree search
    const queryCartesian = latLonToCartesian(lat, lon);
    const queryPoint = {
      x: queryCartesian.x,
      y: queryCartesian.y,
      z: queryCartesian.z,
    };
    
    console.log(`Query for (${lat}, ${lon}) converted to 3D: (${queryPoint.x.toFixed(4)}, ${queryPoint.y.toFixed(4)}, ${queryPoint.z.toFixed(4)})`);

    // Find nearest grid point using KD-tree
    const nearest = this.kdTree.nearest(queryPoint, 1);

    if (!nearest || nearest.length === 0) {
      throw new Error('No nearby grid point found');
    }

    const [nearestPoint, chordDistance] = nearest[0];
    const gridIndex = nearestPoint.gridIndex;
    const gridPoint = this.gridPoints.get(gridIndex);

    if (!gridPoint) {
      throw new Error(`Grid point ${gridIndex} not found`);
    }

    // Calculate actual great-circle distance for reporting
    const actualDistance = haversineDistance(lat, lon, gridPoint.lat, gridPoint.lon);

    // Query forecast data for this grid point and day
    const { data: forecastData, error } = await this.supabase
      .from('weather_forecasts')
      .select('avg_temperature, max_temperature, min_temperature, precipitation_sum, snowfall_amount, solar_radiation')
      .eq('grid_index', gridIndex)
      .eq('day_of_year', dayOfYear)
      .single();

    if (error || !forecastData) {
      console.error('Error querying forecast:', error);
      throw new Error(
        `No forecast data found for grid ${gridIndex} on day ${dayOfYear}`
      );
    }

    return {
      gridIndex,
      location: {
        lat: gridPoint.lat,
        lon: gridPoint.lon,
      },
      distance: actualDistance,
      temperature: forecastData.avg_temperature,
      maxTemperature: forecastData.max_temperature,
      minTemperature: forecastData.min_temperature,
      precipitationSum: forecastData.precipitation_sum,
      snowfallAmount: forecastData.snowfall_amount,
      solarRadiation: forecastData.solar_radiation,
      dayOfYear,
      nearestPointDistance: actualDistance,
    };
  }

  /**
   * Get weather by specific grid index (useful for map clicks)
   */
  async getWeatherByGridIndex(
    gridIndex: number,
    dayOfYear: number
  ): Promise<WeatherResult | null> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const gridPoint = this.gridPoints.get(gridIndex);
    if (!gridPoint) {
      return null;
    }

    const { data: forecastData, error } = await this.supabase
      .from('weather_forecasts')
      .select('avg_temperature, max_temperature, min_temperature, precipitation_sum, snowfall_amount, solar_radiation')
      .eq('grid_index', gridIndex)
      .eq('day_of_year', dayOfYear)
      .single();

    if (error || !forecastData) {
      return null;
    }

    return {
      gridIndex,
      location: {
        lat: gridPoint.lat,
        lon: gridPoint.lon,
      },
      distance: 0,
      temperature: forecastData.avg_temperature,
      maxTemperature: forecastData.max_temperature,
      minTemperature: forecastData.min_temperature,
      precipitationSum: forecastData.precipitation_sum,
      snowfallAmount: forecastData.snowfall_amount,
      solarRadiation: forecastData.solar_radiation,
      dayOfYear,
      nearestPointDistance: 0,
    };
  }

  /**
   * Get temperature range for a specific day (for map color scaling)
   */
  async getTemperatureRange(dayOfYear: number): Promise<TempRange> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const { data, error } = await this.supabase
      .from('weather_forecasts')
      .select('avg_temperature')
      .eq('day_of_year', dayOfYear);

    if (error || !data) {
      // Return default range if error
      return { min: -20, max: 40 };
    }

    const temperatures = data.map((d) => d.avg_temperature);
    return {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures),
    };
  }

  /**
   * Get all grid points (for map rendering)
   */
  getAllGridPoints(): GridPoint[] {
    return Array.from(this.gridPoints.values());
  }
}

/**
 * Get current day of year (1-365)
 */
function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Singleton instance
let serviceInstance: WeatherGeoService | null = null;

/**
 * Get or create singleton instance of WeatherGeoService
 */
export async function getWeatherService(): Promise<WeatherGeoService> {
  // Force reinit to ensure new code is used
  if (!serviceInstance || !serviceInstance['initialized']) {
    console.log('Creating new WeatherGeoService instance with 3D Cartesian coordinates');
    serviceInstance = new WeatherGeoService();
    await serviceInstance.init();
  }
  return serviceInstance;
}

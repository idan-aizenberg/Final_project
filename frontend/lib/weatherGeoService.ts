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

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize the service by loading grid points and building KD-tree
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing WeatherGeoService...');

    // Load all grid points from database
    const { data: gridData, error } = await this.supabase
      .from('weather_grid')
      .select('grid_index, latitude, longitude')
      .order('grid_index');

    if (error) {
      console.error('Error loading grid points:', error);
      throw new Error('Failed to load grid points from database');
    }

    if (!gridData || gridData.length === 0) {
      throw new Error('No grid points found in database');
    }

    // Store grid points in Map for O(1) lookup
    const pointsForTree: Array<{ lat: number; lon: number; gridIndex: number }> = [];

    for (const point of gridData) {
      const gridPoint: GridPoint = {
        gridIndex: point.grid_index,
        lat: point.latitude,
        lon: point.longitude,
      };

      this.gridPoints.set(point.grid_index, gridPoint);
      pointsForTree.push({
        lat: point.latitude,
        lon: point.longitude,
        gridIndex: point.grid_index,
      });
    }

    // Build KD-Tree with haversine distance function
    const distance = (a: any, b: any) => {
      return haversineDistance(a.lat, a.lon, b.lat, b.lon);
    };

    this.kdTree = new kdTree(pointsForTree, distance, ['lat', 'lon']);

    this.initialized = true;
    console.log(`WeatherGeoService initialized with ${this.gridPoints.size} grid points`);
  }

  /**
   * Get weather forecast for a specific location and day
   */
  async getWeatherByLocation(query: WeatherQuery): Promise<WeatherResult> {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call init() first.');
    }

    const { lat, lon, dayOfYear = getCurrentDayOfYear() } = query;

    // Find nearest grid point using KD-tree
    const nearest = this.kdTree.nearest({ lat, lon }, 1);

    if (!nearest || nearest.length === 0) {
      throw new Error('No nearby grid point found');
    }

    const [nearestPoint, distance] = nearest[0];
    const gridIndex = nearestPoint.gridIndex;
    const gridPoint = this.gridPoints.get(gridIndex);

    if (!gridPoint) {
      throw new Error(`Grid point ${gridIndex} not found`);
    }

    // Query forecast data for this grid point and day
    const { data: forecastData, error } = await this.supabase
      .from('weather_forecasts')
      .select('avg_temperature')
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
      distance,
      temperature: forecastData.avg_temperature,
      dayOfYear,
      nearestPointDistance: distance,
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
      .select('avg_temperature')
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
  if (!serviceInstance) {
    serviceInstance = new WeatherGeoService();
    await serviceInstance.init();
  }
  return serviceInstance;
}


import { NextResponse } from 'next/server';
import { WeatherDataLoader } from '@/lib/weatherDataLoader';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    console.log('Starting max temperature data seed process...');
    
    const loader = new WeatherDataLoader();

    // First, load the grid coordinates to get the grid map
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing grid coordinates from database
    console.log('Fetching grid coordinates from database...');
    const { data: gridData, error: gridError } = await supabase
      .from('weather_grid')
      .select('grid_index, longitude, latitude');

    if (gridError) {
      console.error('Error fetching grid data:', gridError);
      throw new Error(`Failed to fetch grid data: ${gridError.message}`);
    }

    if (!gridData || gridData.length === 0) {
      throw new Error('No grid data found in database. Please run the initial seed first.');
    }

    // Create grid map from database data
    const gridMap = new Map<number, { lon: number; lat: number }>();
    gridData.forEach((point) => {
      gridMap.set(point.grid_index, {
        lon: point.longitude,
        lat: point.latitude,
      });
    });

    console.log(`Loaded ${gridMap.size} grid points from database`);

    // Load max temperature data from CSV file
    const dataPath = path.join(process.cwd(), 'data', 'data_integr_2025_12.csv');
    console.log('Loading max temperature forecast data from:', dataPath);
    
    const lastDay = await loader.loadMaxForecastData(dataPath, gridMap);

    return NextResponse.json({
      success: true,
      gridPoints: gridMap.size,
      daysLoaded: lastDay,
      message: 'Max temperature data seeded successfully',
    });
  } catch (error: any) {
    console.error('Error seeding max temperature data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { WeatherDataLoader } from '@/lib/weatherDataLoader';
import path from 'path';

export async function POST(request: Request) {
  try {
    console.log('Starting weather data seed process...');

    // Initialize loader
    const loader = new WeatherDataLoader();

    // Load grid coordinates from data file
    const gridPath = path.join(process.cwd(), 'data', 'greed_coord (1).dat');
    console.log('Loading grid coordinates from:', gridPath);
    const gridMap = await loader.loadGridCoordinates(gridPath);

    // Load forecast data from CSV
    const dataPath = path.join(process.cwd(), 'data', 'data_integr_2025_14.csv');
    console.log('Loading forecast data from:', dataPath);
    await loader.loadForecastData(dataPath, gridMap);

    return NextResponse.json({
      success: true,
      gridPoints: gridMap.size,
      message: 'Weather data seeded successfully',
    });
  } catch (error: any) {
    console.error('Error seeding weather data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { getWeatherService } from '@/lib/weatherGeoService';

export const dynamic = 'force-dynamic';

function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const dayParam = searchParams.get('day');

    // Validate parameters
    if (!latParam || !lonParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lon' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    const day = dayParam ? parseInt(dayParam) : getCurrentDayOfYear();

    // Validate coordinate ranges
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude. Must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude. Must be between -180 and 180' },
        { status: 400 }
      );
    }

    if (isNaN(day) || day < 1 || day > 365) {
      return NextResponse.json(
        { error: 'Invalid day of year. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Query service
    const service = await getWeatherService();
    const result = await service.getWeatherByLocation({
      lat,
      lon,
      dayOfYear: day,
    });

    // Check if result is empty or null
    if (!result || (result.forecasts && result.forecasts.length === 0)) {
      return NextResponse.json(
        { error: 'No weather data found for this location and date' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error querying weather:', error);
    
    // Handle specific error types
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'No weather data found for this location and date' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to query weather data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


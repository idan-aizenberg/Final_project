import { NextResponse } from 'next/server';
import { getWeatherService } from '@/lib/weatherGeoService';

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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error querying weather:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query weather data' },
      { status: 500 }
    );
  }
}


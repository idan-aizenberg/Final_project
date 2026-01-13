import { NextResponse } from 'next/server';
import { getWeatherService } from '@/lib/weatherGeoService';

export const dynamic = 'force-dynamic';

function getDayOfYearFromDate(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Validate parameters
    if (!latParam || !lonParam || !startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon, startDate, and endDate' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

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

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // Calculate days of year
    const startDay = getDayOfYearFromDate(startDate);
    const endDay = getDayOfYearFromDate(endDate);

    // Validate day of year ranges
    if (startDay < 1 || startDay > 365 || endDay < 1 || endDay > 365) {
      return NextResponse.json(
        { error: 'Invalid day of year. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Query service for each day in range
    const service = await getWeatherService();
    const results = [];

    for (let day = startDay; day <= endDay; day++) {
      try {
        const result = await service.getWeatherByLocation({
          lat,
          lon,
          dayOfYear: day,
        });
        results.push({
          ...result,
          dayOfYear: day,
          date: new Date(2025, 0, day).toISOString().split('T')[0],
        });
      } catch (error) {
        console.warn(`Failed to fetch data for day ${day}:`, error);
        // Continue with other days even if one fails
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No weather data available for the specified date range' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      location: { lat, lon },
      startDate: startDateParam,
      endDate: endDateParam,
      startDay,
      endDay,
      results,
    });
  } catch (error: any) {
    console.error('Error querying weather forecast:', error);
    
    // Handle specific error types
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'No weather data found for this location and date range' },
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
        error: 'Failed to query weather forecast',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

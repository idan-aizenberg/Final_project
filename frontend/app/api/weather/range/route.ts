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
    const dayParam = searchParams.get('day');
    const day = dayParam ? parseInt(dayParam) : getCurrentDayOfYear();

    if (isNaN(day) || day < 1 || day > 365) {
      return NextResponse.json(
        { error: 'Invalid day of year. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    const service = await getWeatherService();
    const range = await service.getTemperatureRange(day);

    return NextResponse.json(range);
  } catch (error: any) {
    console.error('Error getting temperature range:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get temperature range' },
      { status: 500 }
    );
  }
}


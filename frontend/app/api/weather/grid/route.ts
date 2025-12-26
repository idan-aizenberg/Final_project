import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('day');
    const limitParam = searchParams.get('limit');
    const sampleParam = searchParams.get('sample');

    const day = dayParam ? parseInt(dayParam) : getCurrentDayOfYear();
    const limit = limitParam ? parseInt(limitParam) : null;
    const sample = sampleParam === 'true';

    if (isNaN(day) || day < 1 || day > 365) {
      return NextResponse.json(
        { error: 'Invalid day of year. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // For performance, we can either:
    // 1. Sample every Nth point
    // 2. Limit to a specific region
    // 3. Return all (for smaller datasets)

    let query = supabase
      .from('weather_grid')
      .select(
        `
        grid_index,
        latitude,
        longitude,
        weather_forecasts!inner(avg_temperature, max_temperature)
      `
      )
      .eq('weather_forecasts.day_of_year', day);

    // Sample every 10th point for better performance
    if (sample) {
      // We'll return sampled points on the client side after fetching
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching grid data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch grid data' },
        { status: 500 }
      );
    }

    // Transform data to include temperature
    const gridPoints = data?.map((point: any) => ({
      gridIndex: point.grid_index,
      lat: point.latitude,
      lon: point.longitude,
      temperature: point.weather_forecasts[0]?.avg_temperature || 0,
      maxTemperature: point.weather_forecasts[0]?.max_temperature,
    })) || [];

    // If sampling is requested, take every 10th point
    const finalPoints = sample
      ? gridPoints.filter((_: any, idx: number) => idx % 10 === 0)
      : gridPoints;

    return NextResponse.json({
      points: finalPoints,
      total: gridPoints.length,
      sampled: sample,
    });
  } catch (error: any) {
    console.error('Error in grid endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}


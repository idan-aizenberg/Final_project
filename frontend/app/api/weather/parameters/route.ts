import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDay = parseInt(searchParams.get('startDay') || '1');
    const endDay = parseInt(searchParams.get('endDay') || '365');
    const minTemp = searchParams.get('minTemp');
    const maxTemp = searchParams.get('maxTemp');
    const minMaxTemp = searchParams.get('minMaxTemp');
    const maxMaxTemp = searchParams.get('maxMaxTemp');

    if (!minTemp && !maxTemp && !minMaxTemp && !maxMaxTemp) {
      return NextResponse.json(
        { error: 'At least one temperature parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for forecasts within date range and temperature range
  let query = supabase
      .from('weather_forecasts')
      .select('grid_index, day_of_year, avg_temperature, max_temperature, min_temperature, precipitation_sum, snowfall_amount, solar_radiation')
      .gte('day_of_year', startDay)
      .lte('day_of_year', endDay);

    if (minTemp) {
      query = query.gte('avg_temperature', parseFloat(minTemp));
    }

    if (maxTemp) {
      query = query.lte('avg_temperature', parseFloat(maxTemp));
    }

    if (minMaxTemp) {
      query = query.gte('max_temperature', parseFloat(minMaxTemp));
    }

    if (maxMaxTemp) {
      query = query.lte('max_temperature', parseFloat(maxMaxTemp));
    }

    const { data: forecasts, error: forecastError } = await query;

    if (forecastError) {
      console.error('Error fetching forecasts:', forecastError);
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      );
    }

    if (!forecasts || forecasts.length === 0) {
      return NextResponse.json({
        locations: [],
        message: 'No locations match your criteria',
      });
    }

    // Group by grid_index and get unique locations
    const gridIndexMap = new Map<number, { avgTemp: number; maxTemp?: number; minTemp?: number; precip?: number; snowfall?: number; solar?: number; day: number }>();
    
    forecasts.forEach((forecast) => {
      if (!gridIndexMap.has(forecast.grid_index)) {
        gridIndexMap.set(forecast.grid_index, {
          avgTemp: forecast.avg_temperature,
          maxTemp: forecast.max_temperature,
          minTemp: forecast.min_temperature,
          precip: forecast.precipitation_sum,
          snowfall: forecast.snowfall_amount,
          solar: forecast.solar_radiation,
          day: forecast.day_of_year,
        });
      }
    });

    // Get grid coordinates for matching indices
    const gridIndices = Array.from(gridIndexMap.keys());
    
    // Fetch in batches to avoid URL length limits
    const batchSize = 100;
    const allGridData = [];
    
    for (let i = 0; i < gridIndices.length; i += batchSize) {
      const batch = gridIndices.slice(i, i + batchSize);
      const { data: gridData, error: gridError } = await supabase
        .from('weather_grid')
        .select('grid_index, latitude, longitude')
        .in('grid_index', batch);

      if (gridError) {
        console.error('Error fetching grid data:', gridError);
        continue;
      }

      if (gridData) {
        allGridData.push(...gridData);
      }
    }

    // Combine results
    const locations = allGridData.map((grid) => {
      const forecastData = gridIndexMap.get(grid.grid_index);
      return {
        gridIndex: grid.grid_index,
        location: {
          lat: grid.latitude,
          lon: grid.longitude,
        },
        temperature: forecastData?.avgTemp || 0,
        maxTemperature: forecastData?.maxTemp,
        minTemperature: forecastData?.minTemp,
        precipitationSum: forecastData?.precip,
        snowfallAmount: forecastData?.snowfall,
        solarRadiation: forecastData?.solar,
        dayOfYear: forecastData?.day || startDay,
      };
    });

    return NextResponse.json({
      locations,
      count: locations.length,
      dateRange: { startDay, endDay },
      tempRange: { minAvg: minTemp, maxAvg: maxTemp, minMax: minMaxTemp, maxMax: maxMaxTemp },
    });
  } catch (error: any) {
    console.error('Error in parameters search:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const minWindSpeed = searchParams.get('minWindSpeed');
    const maxWindSpeed = searchParams.get('maxWindSpeed');
    const minPrecipitation = searchParams.get('minPrecipitation');
    const maxPrecipitation = searchParams.get('maxPrecipitation');
    const minSnowfall = searchParams.get('minSnowfall');
    const maxSnowfall = searchParams.get('maxSnowfall');
    const minSolarRadiation = searchParams.get('minSolarRadiation');
    const maxSolarRadiation = searchParams.get('maxSolarRadiation');

    if (!minTemp && !maxTemp && !minWindSpeed && !maxWindSpeed && !minPrecipitation && !maxPrecipitation && !minSnowfall && !maxSnowfall && !minSolarRadiation && !maxSolarRadiation) {
      return NextResponse.json(
        { error: 'At least one parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for forecasts within date range and parameters
  let query = supabase
      .from('weather_forecasts')
      .select('grid_index, day_of_year, avg_temperature, max_temperature, min_temperature, precipitation_sum, snowfall_amount, solar_radiation, wind_speed_u_max, wind_speed_v_max')
      .gte('day_of_year', startDay)
      .lte('day_of_year', endDay);

    if (minTemp) {
      query = query.gte('avg_temperature', parseFloat(minTemp));
    }

    if (maxTemp) {
      query = query.lte('avg_temperature', parseFloat(maxTemp));
    }

    if (minPrecipitation) {
      query = query.gte('precipitation_sum', parseFloat(minPrecipitation));
    }

    if (maxPrecipitation) {
      query = query.lte('precipitation_sum', parseFloat(maxPrecipitation));
    }

    if (minSnowfall) {
      query = query.gte('snowfall_amount', parseFloat(minSnowfall));
    }

    if (maxSnowfall) {
      query = query.lte('snowfall_amount', parseFloat(maxSnowfall));
    }

    if (minSolarRadiation) {
      query = query.gte('solar_radiation', parseFloat(minSolarRadiation));
    }

    if (maxSolarRadiation) {
      query = query.lte('solar_radiation', parseFloat(maxSolarRadiation));
    }

    const { data: forecasts, error: forecastError } = await query;

    if (forecastError) {
      console.error('Error fetching forecasts:', forecastError);
      
      // Handle specific Supabase error codes
      if (forecastError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No weather data found for the specified date range' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch weather data',
          details: process.env.NODE_ENV === 'development' ? forecastError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!forecasts || forecasts.length === 0) {
      return NextResponse.json({
        locations: [],
        message: 'No locations match your criteria',
      });
    }

    // Filter by wind speed if specified (calculate magnitude from U and V components)
    let filteredForecasts = forecasts;
    if (minWindSpeed || maxWindSpeed) {
      const minWind = minWindSpeed ? parseFloat(minWindSpeed) : 0;
      const maxWind = maxWindSpeed ? parseFloat(maxWindSpeed) : Infinity;
      
      filteredForecasts = forecasts.filter((forecast) => {
        const windU = forecast.wind_speed_u_max || 0;
        const windV = forecast.wind_speed_v_max || 0;
        const windMagnitude = Math.sqrt(windU * windU + windV * windV);
        return windMagnitude >= minWind && windMagnitude <= maxWind;
      });
    }

    // Group by grid_index and get unique locations
    const gridIndexMap = new Map<number, { avgTemp: number; maxTemp?: number; minTemp?: number; precip?: number; snowfall?: number; solar?: number; windU?: number; windV?: number; day: number }>();
    
    filteredForecasts.forEach((forecast) => {
      if (!gridIndexMap.has(forecast.grid_index)) {
        gridIndexMap.set(forecast.grid_index, {
          avgTemp: forecast.avg_temperature,
          maxTemp: forecast.max_temperature,
          minTemp: forecast.min_temperature,
          precip: forecast.precipitation_sum,
          snowfall: forecast.snowfall_amount,
          solar: forecast.solar_radiation,
          windU: forecast.wind_speed_u_max,
          windV: forecast.wind_speed_v_max,
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
      
      // Calculate wind speed magnitude if wind data is available
      let windSpeed: number | undefined;
      if (forecastData?.windU !== undefined && forecastData?.windV !== undefined) {
        const windU = forecastData.windU;
        const windV = forecastData.windV;
        windSpeed = Math.sqrt(windU * windU + windV * windV);
      }
      
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
        windSpeed: windSpeed,
        windSpeedU: forecastData?.windU,
        windSpeedV: forecastData?.windV,
        dayOfYear: forecastData?.day || startDay,
      };
    });

    return NextResponse.json({
      locations,
      count: locations.length,
      dateRange: { startDay, endDay },
      tempRange: { min: minTemp, max: maxTemp },
      windRange: { min: minWindSpeed, max: maxWindSpeed },
      precipitationRange: { min: minPrecipitation, max: maxPrecipitation },
      snowfallRange: { min: minSnowfall, max: maxSnowfall },
      solarRadiationRange: { min: minSolarRadiation, max: maxSolarRadiation },
    });
  } catch (error: any) {
    console.error('Error in parameters search:', error);
    
    // Handle specific error types
    if (error.message?.includes('fetch')) {
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
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

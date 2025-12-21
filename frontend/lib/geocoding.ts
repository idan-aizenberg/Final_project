export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export interface LocationSuggestion {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type?: string;
}

/**
 * Geocode a location name to coordinates using OpenStreetMap Nominatim API
 * @param query - Location name (e.g., "Tel Aviv", "New York", "Tokyo")
 * @returns Coordinates and display name
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'WeatherSight/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`Location "${query}" not found`);
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (error: any) {
    throw new Error(`Failed to geocode location: ${error.message}`);
  }
}

/**
 * Search for location suggestions (autocomplete)
 * @param query - Partial location name
 * @returns Array of location suggestions
 */
export async function searchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WeatherSight/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      console.error(`Geocoding API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (error: any) {
    console.error('Failed to search locations:', error);
    return [];
  }
}


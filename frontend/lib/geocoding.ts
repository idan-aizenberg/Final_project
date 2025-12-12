interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
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


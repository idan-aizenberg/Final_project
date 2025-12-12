# Weather Forecast System Setup Guide

## Overview

The Weather Forecast System uses a global grid of ~13,000 coordinate points to provide temperature forecasts for any location on Earth. It uses KD-tree spatial indexing for fast location queries.

## Prerequisites

1. **Supabase Account** - You need a Supabase project set up
2. **Environment Variables** - Configure `.env.local` with Supabase credentials
3. **Data Files** - Ensure these files are in the `/data/` directory:
   - `greed_coord (1).dat` - Grid coordinates (~13K points)
   - `data_integr_2025_14.csv` - Temperature forecast data

## Step 1: Database Setup

### Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the schema from `frontend/supabase-weather-schema.sql`

This will create:
- `weather_grid` table - Stores grid coordinates (13,000 points)
- `weather_forecasts` table - Stores daily temperature forecasts (365 days × 13,000 points)

### Environment Variables

Create or update `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 2: Load Weather Data

### One-Time Data Seeding

After setting up the database, you need to load the data files into Supabase:

1. **Ensure data files are in place:**
   - `C:\Users\aviva\Desktop\Final_project\data\greed_coord (1).dat`
   - `C:\Users\aviva\Desktop\Final_project\data\data_integr_2025_14.csv`

2. **Run the seed endpoint:**

```bash
# Using curl (PowerShell)
Invoke-WebRequest -Uri "http://localhost:3000/api/weather/seed" -Method POST

# Or visit in browser (if you add GET support)
# http://localhost:3000/api/weather/seed
```

This process will:
- Load 13,000 grid coordinates
- Load 14 days of temperature data
- Fill missing days (15-365) with the last day's data
- Takes approximately 2-5 minutes depending on your connection

## Step 3: Using the System

### Search by City Name

1. Go to `/search` page
2. Enter a city name (e.g., "Tel Aviv", "New York", "London")
3. Click Search
4. The system will:
   - Geocode the city to coordinates
   - Find the nearest grid point using KD-tree
   - Retrieve forecast from database
   - Display temperature and highlight on map

### Query by Coordinates

Click anywhere on the map to query the forecast for that location.

### Change Date

Use the "Day" input (1-365) to view forecasts for different days:
- Day 1 = January 1
- Day 14 = January 14 (current data)
- Day 180 = June 29
- Day 365 = December 31

## API Endpoints

### POST /api/weather/seed

Seeds the database with grid and forecast data (one-time operation).

### GET /api/weather/query

Query weather forecast by coordinates:
```
GET /api/weather/query?lat=32.08&lon=34.78&day=14
```

Returns:
```json
{
  "gridIndex": 5432,
  "location": { "lat": 32.1, "lon": 34.8 },
  "distance": 2.3,
  "temperature": 23.5,
  "dayOfYear": 14,
  "nearestPointDistance": 2.3
}
```

### GET /api/weather/range

Get min/max temperature range for a specific day (for map color scaling):
```
GET /api/weather/range?day=14
```

Returns:
```json
{
  "min": -15.2,
  "max": 35.8
}
```

### GET /api/weather/grid

Get grid points with temperatures for map visualization:
```
GET /api/weather/grid?day=14&sample=true
```

Parameters:
- `day` - Day of year (1-365)
- `sample` - If true, returns every 10th point for better performance
- `limit` - Optional limit on number of points returned

## Data Files Format

### greed_coord (1).dat

Tab/space-separated values, no header:
```
Grid_Index  Row  Col  Longitude  Latitude
0           0    0    -179.75    -90
1           0    1    -160.623   -90
...
```

We use columns: 0 (Grid Index), 3 (Longitude), 4 (Latitude)

### data_integr_2025_14.csv

Comma-separated values, no header:
- Each row = day of year (row 0 = Jan 1, row 1 = Jan 2, etc.)
- Each column = grid index (column 0 = grid 0, column 1 = grid 1, etc.)
- Each value = average temperature forecast (°C)

Currently has 14 rows; days 15-365 are filled with day 14's data.

## Architecture

```
User enters "Tel Aviv"
    ↓
Geocoding API → (32.08, 34.78)
    ↓
/api/weather/query
    ↓
WeatherGeoService (KD-tree)
    ↓
Find nearest grid point (e.g., grid 5432)
    ↓
Query Supabase: weather_forecasts WHERE grid_index=5432 AND day_of_year=14
    ↓
Return temperature: 23.5°C
    ↓
Display on map + show result card
```

## Performance Notes

- **KD-tree queries:** O(log n) - Very fast even with 13K points
- **Map rendering:** Sampled to ~1,300 points for smooth interaction
- **Database queries:** Indexed for fast lookups
- **Memory usage:** ~50MB for in-memory KD-tree

## Troubleshooting

### "Service not initialized" error
- The WeatherGeoService singleton needs to load grid points on first request
- This may take a few seconds on the first API call
- Subsequent calls will be fast (cached in memory)

### "No grid points found in database"
- Run the seed endpoint first: `POST /api/weather/seed`
- Verify Supabase connection
- Check that weather_grid table has data

### Map not showing points
- Check browser console for errors
- Verify `/api/weather/grid` endpoint returns data
- Check that day of year is valid (1-365)

### Slow map performance
- Use `sample=true` parameter in grid API (already default)
- Consider implementing viewport-based loading
- Use map clustering library (react-leaflet-cluster)

## Example Queries

### Tel Aviv
```javascript
// Coordinates: 32.08°N, 34.78°E
fetch('/api/weather/query?lat=32.08&lon=34.78&day=14')
```

### New York
```javascript
// Coordinates: 40.71°N, 74.01°W
fetch('/api/weather/query?lat=40.71&lon=-74.01&day=14')
```

### Tokyo
```javascript
// Coordinates: 35.68°N, 139.65°E
fetch('/api/weather/query?lat=35.68&lon=139.65&day=14')
```


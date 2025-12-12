"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Calendar, Thermometer, Grid3x3 } from "lucide-react";
import { geocodeLocation } from "@/lib/geocoding";
import { PageHeader } from "@/components/layout/PageHeader";
import dynamic from "next/dynamic";

// Dynamically import map to avoid SSR issues with Leaflet
const WeatherMap = dynamic(
  () => import("@/components/shared/WeatherMap").then((mod) => mod.WeatherMap),
  { ssr: false }
);

interface WeatherData {
  gridIndex: number;
  location: { lat: number; lon: number };
  distance: number;
  temperature: number;
  dayOfYear: number;
  cityName?: string;
  displayName?: string;
  searchedLocation?: { lat: number; lon: number };
}

function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDayOfYearDate(dayOfYear: number): string {
  const date = new Date(2025, 0, dayOfYear);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SearchPage() {
  const [location, setLocation] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [dayOfYear, setDayOfYear] = useState(getCurrentDayOfYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCitySearch = async () => {
    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Geocode city name to coordinates
      const geocodeResult = await geocodeLocation(location);

      // Step 2: Query weather at those coordinates
      // This will use KD-tree to find closest grid and get forecast from DB
      const response = await fetch(
        `/api/weather/query?lat=${geocodeResult.lat}&lon=${geocodeResult.lon}&day=${dayOfYear}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data = await response.json();

      // Step 3: Update state with results
      setWeatherData({
        ...data,
        cityName: location,
        displayName: geocodeResult.displayName,
        searchedLocation: { lat: geocodeResult.lat, lon: geocodeResult.lon },
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat: number, lon: number) => {
    // Direct coordinate query from map click
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/weather/query?lat=${lat}&lon=${lon}&day=${dayOfYear}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data = await response.json();
      setWeatherData({
        ...data,
        searchedLocation: { lat, lon },
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Map click error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Weather Forecast Search"
        description="Search for any location to view temperature forecasts from our global grid"
      />

      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-6">
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Search city (e.g., Tel Aviv, New York, Tokyo)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCitySearch()}
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button onClick={handleCitySearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Day"
                    value={dayOfYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= 365) setDayOfYear(val);
                    }}
                    min={1}
                    max={365}
                    className="w-24"
                    title="Day of year (1-365)"
                    disabled={loading}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {getDayOfYearDate(dayOfYear)}
                  </span>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Weather Result Display */}
          {weatherData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {weatherData.cityName || 'Selected Location'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Temperature</p>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      {weatherData.temperature.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Date</p>
                    </div>
                    <p className="text-xl font-semibold">Day {weatherData.dayOfYear}</p>
                    <p className="text-xs text-muted-foreground">{getDayOfYearDate(weatherData.dayOfYear)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Grid Index</p>
                    </div>
                    <p className="text-xl font-semibold">{weatherData.gridIndex}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Grid Location</p>
                    </div>
                    <p className="text-sm font-mono">
                      {weatherData.location.lat.toFixed(2)}°, {weatherData.location.lon.toFixed(2)}°
                    </p>
                  </div>
                </div>

                {weatherData.displayName && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Forecast for:</strong> {weatherData.displayName}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Using closest grid point ({weatherData.distance.toFixed(2)} km away)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Global Weather Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-border">
                <WeatherMap
                  dayOfYear={dayOfYear}
                  onLocationClick={handleMapClick}
                  selectedGridIndex={weatherData?.gridIndex}
                  highlightLocation={weatherData?.searchedLocation}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click anywhere on the map to view the forecast for that location
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

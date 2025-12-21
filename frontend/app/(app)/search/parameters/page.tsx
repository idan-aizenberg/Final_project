"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, MapPin, Thermometer, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import map to avoid SSR issues with Leaflet
const WeatherMap = dynamic(
  () => import("@/components/shared/WeatherMap").then((mod) => mod.WeatherMap),
  { ssr: false }
);

interface LocationResult {
  gridIndex: number;
  location: { lat: number; lon: number };
  temperature: number;
  dayOfYear: number;
}

function getDayOfYearFromDate(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDateFromDayOfYear(dayOfYear: number, year: number = 2025): Date {
  const date = new Date(year, 0);
  date.setDate(dayOfYear);
  return date;
}

export default function ParametersSearchPage() {
  // Temperature range
  const [minTemp, setMinTemp] = useState<string>("");
  const [maxTemp, setMaxTemp] = useState<string>("");

  // Date range
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2025, 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(2025, 0, 31));

  // Results and state
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const handleSearch = async () => {
    if (!minTemp && !maxTemp) {
      setError("Please enter at least a minimum or maximum temperature");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select a date range");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const startDay = getDayOfYearFromDate(startDate);
      const endDay = getDayOfYearFromDate(endDate);

      // Query API for locations matching parameters
      const queryParams = new URLSearchParams({
        startDay: startDay.toString(),
        endDay: endDay.toString(),
        ...(minTemp && { minTemp }),
        ...(maxTemp && { maxTemp }),
      });

      const response = await fetch(`/api/weather/parameters?${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data = await response.json();
      setResults(data.locations || []);
      
      // Set selected day to the first day in range for map display
      setSelectedDay(startDay);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Parameters-Based Search"
        description="Find locations that match your weather criteria"
      />

      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-6">
          {/* Search Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Search Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature Range (°C)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minTemp" className="text-sm text-muted-foreground">
                      Minimum Temperature
                    </Label>
                    <Input
                      id="minTemp"
                      type="number"
                      placeholder="e.g., 15"
                      value={minTemp}
                      onChange={(e) => setMinTemp(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxTemp" className="text-sm text-muted-foreground">
                      Maximum Temperature
                    </Label>
                    <Input
                      id="maxTemp"
                      type="number"
                      placeholder="e.g., 25"
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm text-muted-foreground">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          defaultMonth={startDate}
                          fromDate={new Date(2025, 0, 1)}
                          toDate={new Date(2025, 11, 31)}
                          disabled={(date) => date.getFullYear() !== 2025}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label className="text-sm text-muted-foreground">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          defaultMonth={endDate}
                          fromDate={new Date(2025, 0, 1)}
                          toDate={new Date(2025, 11, 31)}
                          disabled={(date) => date.getFullYear() !== 2025}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSearch}
                  disabled={loading || (!minTemp && !maxTemp)}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? 'Searching...' : 'Find Locations'}
                </Button>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Matching Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Found <strong>{results.length}</strong> locations matching your criteria
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                      {results.slice(0, 20).map((result, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <p className="text-xs text-muted-foreground">Grid {result.gridIndex}</p>
                          <p className="text-sm font-semibold">
                            {result.temperature.toFixed(1)}°C
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.location.lat.toFixed(2)}°, {result.location.lon.toFixed(2)}°
                          </p>
                        </div>
                      ))}
                    </div>
                    {results.length > 20 && (
                      <p className="text-xs text-muted-foreground italic">
                        Showing 20 of {results.length} results. View on map below.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Map */}
              <Card>
                <CardHeader>
                  <CardTitle>Results Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <WeatherMap
                      dayOfYear={selectedDay}
                      highlightGridIndices={results.map(r => r.gridIndex)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Highlighted locations match your search criteria
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


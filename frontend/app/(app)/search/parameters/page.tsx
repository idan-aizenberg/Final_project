"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Calendar, MapPin, Thermometer, Filter, BookmarkPlus, Bookmark, Lock, Zap, Snowflake, Sun, Wind, Droplets } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import { fetchSavedSearches, createSavedSearch, type SavedSearch } from "@/lib/api";
import { saveSearchResult, getSearchResultById } from "@/lib/resultsStorageService";
import { getDayOfYearFromDate, getDateFromDayOfYear } from "@/lib/format";
import Link from "next/link";
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
  maxTemperature?: number;
  minTemperature?: number;
  precipitationSum?: number;
  snowfallAmount?: number;
  solarRadiation?: number;
  windSpeed?: number;
  windSpeedU?: number;
  windSpeedV?: number;
  dayOfYear: number;
}

export default function ParametersSearchPage() {
  const { tierDefinition } = useTier();
  
  // Temperature range (average)
  const [minTemp, setMinTemp] = useState<string>("");
  const [maxTemp, setMaxTemp] = useState<string>("");

  // Wind speed range (combined magnitude)
  const [minWindSpeed, setMinWindSpeed] = useState<string>("");
  const [maxWindSpeed, setMaxWindSpeed] = useState<string>("");

  // Precipitation range
  const [minPrecipitation, setMinPrecipitation] = useState<string>("");
  const [maxPrecipitation, setMaxPrecipitation] = useState<string>("");

  // Snowfall range
  const [minSnowfall, setMinSnowfall] = useState<string>("");
  const [maxSnowfall, setMaxSnowfall] = useState<string>("");

  // Solar radiation range
  const [minSolarRadiation, setMinSolarRadiation] = useState<string>("");
  const [maxSolarRadiation, setMaxSolarRadiation] = useState<string>("");

  // Date range
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });

  // Results and state
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = tierDefinition.gating.maxLocations;
  const isAtLimit = limit !== "unlimited" && savedSearches.length >= limit;

  // Handle numeric input with validation
  const handleNumericInput = (
    value: string,
    setter: (v: string) => void,
    min?: number,
    max?: number
  ) => {
    // Allow empty string
    if (value === '') {
      setter(value);
      return;
    }
    
    // Allow negative sign for temperature
    if (value === '-') {
      setter(value);
      return;
    }
    
    const num = parseFloat(value);
    
    // Check if it's a valid number
    if (isNaN(num)) {
      return; // Don't update if invalid
    }
    
    // Check min/max constraints
    if (min !== undefined && num < min) {
      return;
    }
    if (max !== undefined && num > max) {
      return;
    }
    
    setter(value);
  };

  // Load saved searches count
  const loadSavedSearches = useCallback(async () => {
    try {
      const { searches } = await fetchSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error("Failed to load saved searches:", error);
    }
  }, []);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  // Restore search from Results Workspace
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const restoreId = searchParams.get('restoreId');
    
    if (restoreId) {
      const result = getSearchResultById(restoreId);
      if (result && result.query) {
        // Populate all form fields from stored query
        setMinTemp(result.query.minTemp || '');
        setMaxTemp(result.query.maxTemp || '');
        setMinWindSpeed(result.query.minWindSpeed || '');
        setMaxWindSpeed(result.query.maxWindSpeed || '');
        setMinPrecipitation(result.query.minPrecipitation || '');
        setMaxPrecipitation(result.query.maxPrecipitation || '');
        setMinSnowfall(result.query.minSnowfall || '');
        setMaxSnowfall(result.query.maxSnowfall || '');
        setMinSolarRadiation(result.query.minSolarRadiation || '');
        setMaxSolarRadiation(result.query.maxSolarRadiation || '');
        
        // Set date range
        if (result.query.startDay && result.query.endDay) {
          const from = getDateFromDayOfYear(result.query.startDay);
          const to = getDateFromDayOfYear(result.query.endDay);
          setDateRange({ from, to });
          
          // Trigger search automatically after state is set
          // Use setTimeout to ensure React has processed state updates
          setTimeout(() => {
            handleSearch();
          }, 50);
        }
        
        // Clean URL
        window.history.replaceState({}, '', '/search/parameters');
      }
    }
  }, []);

  // Handle save search
  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this saved search",
        variant: "destructive",
      });
      return;
    }

    if (!dateRange.from) {
      toast({
        title: "Date required",
        description: "Please select a date range before saving",
        variant: "destructive",
      });
      return;
    }

    if (isAtLimit) {
      toast({
        title: "Limit reached",
        description: `You've reached your saved search limit (${limit})`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // For parameter searches, we save with a special format
      // Using the first result's location as the reference, or 0,0 if no results
      const refLat = results.length > 0 ? results[0].location.lat : 0;
      const refLon = results.length > 0 ? results[0].location.lon : 0;
      
      const startDate = dateRange.from;
      const endDate = dateRange.to || dateRange.from;
      
      await createSavedSearch({
        name: searchName.trim(),
        location: `Temp: ${minTemp || "any"}°C - ${maxTemp || "any"}°C`,
        lat: refLat,
        lon: refLon,
        displayName: `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}, ${minTemp || "any"}°C to ${maxTemp || "any"}°C`,
        dayOfYear: getDayOfYearFromDate(startDate),
        resolution: "daily",
        forecastType: "standard",
      });

      toast({
        title: "Search saved!",
        description: `"${searchName.trim()}" has been saved`,
      });

      setSearchName("");
      setShowSaveDialog(false);
      loadSavedSearches();
    } catch (error) {
      console.error("Error saving search:", error);
      toast({
        title: "Failed to save",
        description: "An error occurred while saving your search",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    // Check if this is a restore/view operation (don't save duplicates)
    const searchParams = new URLSearchParams(window.location.search);
    const isRestore = searchParams.get('restore') === 'true';
    const isFromSaved = searchParams.get('fromSaved') === 'true';
    const shouldSave = !isRestore && !isFromSaved;
    
    if (!minTemp && !maxTemp && !minWindSpeed && !maxWindSpeed && !minPrecipitation && !maxPrecipitation && !minSnowfall && !maxSnowfall && !minSolarRadiation && !maxSolarRadiation) {
      setError("Please enter at least one parameter");
      return;
    }

    if (!dateRange.from) {
      setError("Please select a date or date range");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const startDate = dateRange.from;
      const endDate = dateRange.to || dateRange.from;
      const startDay = getDayOfYearFromDate(startDate);
      const endDay = getDayOfYearFromDate(endDate);

      // Query API for locations matching parameters
      const queryParams = new URLSearchParams({
        startDay: startDay.toString(),
        endDay: endDay.toString(),
        ...(minTemp && { minTemp }),
        ...(maxTemp && { maxTemp }),
        ...(minWindSpeed && { minWindSpeed }),
        ...(maxWindSpeed && { maxWindSpeed }),
        ...(minPrecipitation && { minPrecipitation }),
        ...(maxPrecipitation && { maxPrecipitation }),
        ...(minSnowfall && { minSnowfall }),
        ...(maxSnowfall && { maxSnowfall }),
        ...(minSolarRadiation && { minSolarRadiation }),
        ...(maxSolarRadiation && { maxSolarRadiation }),
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

      // Auto-save search result (only for new searches, not restores or saved search runs)
      if (shouldSave) {
        try {
          const params: string[] = [];
          if (minTemp) params.push(`Min Temp: ${minTemp}°C`);
          if (maxTemp) params.push(`Max Temp: ${maxTemp}°C`);
          if (minWindSpeed) params.push(`Min Wind: ${minWindSpeed} m/s`);
          if (maxWindSpeed) params.push(`Max Wind: ${maxWindSpeed} m/s`);
          if (minPrecipitation) params.push(`Min Precip: ${minPrecipitation} mm`);
          if (maxPrecipitation) params.push(`Max Precip: ${maxPrecipitation} mm`);
          if (minSnowfall) params.push(`Min Snow: ${minSnowfall} mm`);
          if (maxSnowfall) params.push(`Max Snow: ${maxSnowfall} mm`);
          if (minSolarRadiation) params.push(`Min Solar: ${minSolarRadiation} J/m²`);
          if (maxSolarRadiation) params.push(`Max Solar: ${maxSolarRadiation} J/m²`);

          saveSearchResult({
            searchType: 'parameters',
            query: {
              minTemp,
              maxTemp,
              minWindSpeed,
              maxWindSpeed,
              minPrecipitation,
              maxPrecipitation,
              minSnowfall,
              maxSnowfall,
              minSolarRadiation,
              maxSolarRadiation,
              startDay,
              endDay,
            },
            summary: {
              location: `Parameters Search (${data.locations?.length || 0} locations)`,
              dateRange: {
                start: format(startDate!, "MMM d, yyyy"),
                end: format(endDate!, "MMM d, yyyy"),
              },
              matchCount: data.locations?.length || 0,
              params,
            },
            resultData: {
              locations: data.locations,
              count: data.count,
            },
          });
        } catch (saveError) {
          console.error('Failed to save search result:', saveError);
          // Don't show error to user, just log it
        }
      }
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
              {/* Average Temperature Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-primary" />
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

              {/* Wind Speed Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Wind className="h-4 w-4 text-cyan-500" />
                  Wind Speed Range (m/s)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minWindSpeed" className="text-sm text-muted-foreground">
                      Minimum Wind Speed
                    </Label>
                    <Input
                      id="minWindSpeed"
                      type="number"
                      placeholder="e.g., 0"
                      value={minWindSpeed}
                      onChange={(e) => setMinWindSpeed(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxWindSpeed" className="text-sm text-muted-foreground">
                      Maximum Wind Speed
                    </Label>
                    <Input
                      id="maxWindSpeed"
                      type="number"
                      placeholder="e.g., 15"
                      value={maxWindSpeed}
                      onChange={(e) => setMaxWindSpeed(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Precipitation Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Precipitation Range (mm)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minPrecipitation" className="text-sm text-muted-foreground">
                      Minimum Precipitation
                    </Label>
                    <Input
                      id="minPrecipitation"
                      type="number"
                      placeholder="e.g., 0"
                      value={minPrecipitation}
                      onChange={(e) => setMinPrecipitation(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxPrecipitation" className="text-sm text-muted-foreground">
                      Maximum Precipitation
                    </Label>
                    <Input
                      id="maxPrecipitation"
                      type="number"
                      placeholder="e.g., 50"
                      value={maxPrecipitation}
                      onChange={(e) => setMaxPrecipitation(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Snowfall Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-indigo-500" />
                  Snowfall Range (mm)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minSnowfall" className="text-sm text-muted-foreground">
                      Minimum Snowfall
                    </Label>
                    <Input
                      id="minSnowfall"
                      type="number"
                      placeholder="e.g., 0"
                      value={minSnowfall}
                      onChange={(e) => setMinSnowfall(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxSnowfall" className="text-sm text-muted-foreground">
                      Maximum Snowfall
                    </Label>
                    <Input
                      id="maxSnowfall"
                      type="number"
                      placeholder="e.g., 100"
                      value={maxSnowfall}
                      onChange={(e) => setMaxSnowfall(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Solar Radiation Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Solar Radiation Range (J/m²)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minSolarRadiation" className="text-sm text-muted-foreground">
                      Minimum Solar Radiation
                    </Label>
                    <Input
                      id="minSolarRadiation"
                      type="number"
                      placeholder="e.g., 0"
                      value={minSolarRadiation}
                      onChange={(e) => setMinSolarRadiation(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxSolarRadiation" className="text-sm text-muted-foreground">
                      Maximum Solar Radiation
                    </Label>
                    <Input
                      id="maxSolarRadiation"
                      type="number"
                      placeholder="e.g., 30000000"
                      value={maxSolarRadiation}
                      onChange={(e) => setMaxSolarRadiation(e.target.value)}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground border-primary/50"
                          )}
                          disabled={loading}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        <span>Pick a date or range</span>
                      )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <CalendarComponent
                      mode="range"
                      selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({ from: range.from, to: range.to || range.from });
                        }
                      }}
                      defaultMonth={new Date(2025, 0, 1)}
                          fromDate={new Date(2025, 0, 1)}
                          toDate={new Date(2025, 11, 31)}
                          disabled={(date) => date.getFullYear() !== 2025}
                      numberOfMonths={2}
                          initialFocus
                        />
                    <div className="px-4 pb-3 pt-2 border-t bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        💡 Click a date for single day, or click and drag to select a range
                      </p>
                  </div>
                      </PopoverContent>
                    </Popover>
              </div>

              {/* Search Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSearch}
                  disabled={loading || (!minTemp && !maxTemp && !minWindSpeed && !maxWindSpeed && !minPrecipitation && !maxPrecipitation && !minSnowfall && !maxSnowfall && !minSolarRadiation && !maxSolarRadiation)}
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

          {/* Empty State */}
          {!loading && results.length === 0 && (minTemp || maxTemp || minWindSpeed || maxWindSpeed || minPrecipitation || maxPrecipitation || minSnowfall || maxSnowfall || minSolarRadiation || maxSolarRadiation) && (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations match your criteria</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your temperature range, date range, or other parameters to find matching locations.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinTemp("");
                      setMaxTemp("");
                      setMinWindSpeed("");
                      setMaxWindSpeed("");
                      setMinPrecipitation("");
                      setMaxPrecipitation("");
                      setMinSnowfall("");
                      setMaxSnowfall("");
                      setMinSolarRadiation("");
                      setMaxSolarRadiation("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Matching Locations
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="gap-2"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Save Search
                    </Button>
                  </div>
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
                          <div className="flex flex-wrap gap-2 items-center">
                            <p className="text-sm font-semibold text-primary">
                              Avg: {result.temperature.toFixed(1)}°C
                            </p>
                            {result.maxTemperature !== undefined && (
                              <p className="text-sm font-semibold text-orange-500">
                                Max: {result.maxTemperature.toFixed(1)}°C
                              </p>
                            )}
                            {result.minTemperature !== undefined && (
                              <p className="text-sm font-semibold text-sky-500">
                                Min: {result.minTemperature.toFixed(1)}°C
                              </p>
                            )}
                            {result.windSpeed !== undefined && (
                              <p className="text-sm font-semibold text-cyan-500 flex items-center gap-1">
                                <Wind className="h-3.5 w-3.5" />
                                Wind: {result.windSpeed.toFixed(1)} m/s
                              </p>
                            )}
                            {result.precipitationSum !== undefined && (
                              <p className="text-sm font-semibold text-blue-500">
                                Rain: {result.precipitationSum.toFixed(2)} mm
                              </p>
                            )}
                            {result.snowfallAmount !== undefined && (
                              <p className="text-sm font-semibold text-indigo-500 flex items-center gap-1">
                                <Snowflake className="h-3.5 w-3.5" />
                                Snow: {result.snowfallAmount.toFixed(2)} mm
                              </p>
                            )}
                            {result.solarRadiation !== undefined && (
                              <p className="text-sm font-semibold text-amber-500 flex items-center gap-1">
                                <Sun className="h-3.5 w-3.5" />
                                Solar: {result.solarRadiation.toFixed(1)}
                              </p>
                            )}
                          </div>
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

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Save Parameter Search
            </DialogTitle>
            <DialogDescription>
              Save this search configuration for quick access later.
            </DialogDescription>
          </DialogHeader>

          {isAtLimit ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-600">Limit Reached</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've used all {limit} saved search slots on your {tierDefinition.name} plan.
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Need more saved searches?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upgrade to save more searches
                    </p>
                  </div>
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/pricing">
                      <Zap className="h-3.5 w-3.5 mr-1" />
                      Upgrade
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Search preview */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {minTemp || "Any"}°C – {maxTemp || "Any"}°C
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {dateRange.from ? format(dateRange.from, "MMM d") : "Start"} – {dateRange.to ? format(dateRange.to, "MMM d") : "End"}, 2025
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {results.length} locations found
                  </Badge>
                </div>
              </div>

              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="search-name">Search name</Label>
                <Input
                  id="search-name"
                  placeholder="e.g., Summer vacation spots"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
                  autoFocus
                />
              </div>

              {/* Usage indicator */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Saved searches</span>
                <span className={cn(
                  "font-medium",
                  limit !== "unlimited" && savedSearches.length >= (limit as number) - 1 && "text-amber-600"
                )}>
                  {savedSearches.length} / {limit === "unlimited" ? "∞" : limit}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            {!isAtLimit && (
              <Button onClick={handleSaveSearch} disabled={saving || !searchName.trim()}>
                {saving ? "Saving..." : "Save Search"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

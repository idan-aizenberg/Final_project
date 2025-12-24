"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Thermometer, Grid3x3, AlertTriangle, Zap, Crown, Clock, Bookmark, BookmarkPlus } from "lucide-react";
import { geocodeLocation, searchLocationSuggestions, type LocationSuggestion } from "@/lib/geocoding";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import dynamic from "next/dynamic";
import { fetchSavedSearches, markSearchAsUsed, type SavedSearch } from "@/lib/api";
import { SaveSearchDialog } from "@/components/shared/SaveSearchDialog";
import { SavedSearchesList } from "@/components/shared/SavedSearchesList";

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

function getDayOfYearDate(dayOfYear: number): string {
  const date = new Date(2025, 0, dayOfYear);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SearchPage() {
  const [location, setLocation] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [dayOfYear, setDayOfYear] = useState(getCurrentDayOfYear());
  const [selectedDate, setSelectedDate] = useState<Date>(getDateFromDayOfYear(getCurrentDayOfYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Tier-related state
  const { 
    tier, 
    tierDefinition, 
    queriesUsedToday, 
    incrementQueryUsage,
    canPerformQuery,
    queriesRemaining,
    maxHorizonDays 
  } = useTier();
  
  // Location autocomplete states
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Saved searches states
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [lastSearchCoords, setLastSearchCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Calculate max date based on tier horizon
  const maxDate = addDays(new Date(), maxHorizonDays);
  const canSearch = canPerformQuery();

  // Fetch saved searches on mount
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

  // Handle location input change and trigger autocomplete
  const handleLocationChange = (value: string) => {
    setLocation(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    if (value.length >= 2) {
      setLoadingSuggestions(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const suggestions = await searchLocationSuggestions(value);
        setLocationSuggestions(suggestions);
        setLoadingSuggestions(false);
        setShowSuggestions(true);
      }, 300);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Validate and execute search
  const executeSearch = async (lat: number, lon: number, cityName?: string, displayName?: string) => {
    // Check query limit
    if (!canSearch) {
      toast({
        title: "Query limit reached",
        description: `You've used all ${tierDefinition.queriesPerDay} queries today. Upgrade for more.`,
        variant: "destructive",
      });
      return;
    }

    // Check horizon limit
    const daysFromNow = differenceInDays(selectedDate, new Date());
    if (daysFromNow > maxHorizonDays) {
      toast({
        title: "Horizon limit exceeded",
        description: `Your ${tierDefinition.name} plan supports forecasts up to ${maxHorizonDays} days ahead.`,
        variant: "destructive",
      });
      return;
    }

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
        cityName: cityName,
        displayName: displayName,
        searchedLocation: { lat, lon },
      });

      // Store last search coordinates for saving
      setLastSearchCoords({ lat, lon });

      // Increment query usage after successful search
      incrementQueryUsage();
      
      toast({
        title: "Forecast loaded",
        description: queriesRemaining === "unlimited" 
          ? "Unlimited queries available"
          : `${typeof queriesRemaining === 'number' ? queriesRemaining - 1 : queriesRemaining} queries remaining today`,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load a saved search into the form and execute it
  const handleLoadSavedSearch = async (search: SavedSearch) => {
    // Update form fields
    setLocation(search.location);
    if (search.dayOfYear) {
      const date = getDateFromDayOfYear(search.dayOfYear);
      setSelectedDate(date);
      setDayOfYear(search.dayOfYear);
    }

    // Mark the search as used
    await markSearchAsUsed(search.id);
    await loadSavedSearches();

    // Execute the search
    await executeSearch(search.lat, search.lon, search.location, search.displayName);
  };

  // Handle location selection from suggestions
  const handleLocationSelect = async (suggestion: LocationSuggestion) => {
    setLocation(suggestion.name);
    setShowSuggestions(false);
    await executeSearch(suggestion.lat, suggestion.lon, suggestion.name, suggestion.displayName);
  };

  const handleCitySearch = async () => {
    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    setShowSuggestions(false);

    try {
      // Step 1: Geocode city name to coordinates
      const geocodeResult = await geocodeLocation(location);
      await executeSearch(geocodeResult.lat, geocodeResult.lon, location, geocodeResult.displayName);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Search error:', err);
    }
  };

  // Handle date change from calendar
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Check if date is within horizon limit
      const daysFromNow = differenceInDays(date, new Date());
      if (daysFromNow > maxHorizonDays) {
        toast({
          title: "Date beyond horizon",
          description: `Upgrade to access forecasts beyond ${maxHorizonDays} days.`,
          variant: "destructive",
        });
        return;
      }
      setSelectedDate(date);
      const newDayOfYear = getDayOfYearFromDate(date);
      setDayOfYear(newDayOfYear);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the input or suggestions
      if (!target.closest('[data-autocomplete-container]')) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleMapClick = async (lat: number, lon: number) => {
    await executeSearch(lat, lon);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Weather Forecast Search"
        description="Search for any location to view temperature forecasts from our global grid"
        actions={
          <div className="flex items-center gap-3">
            {savedSearches.length > 0 && (
              <SavedSearchesList
                searches={savedSearches}
                onLoadSearch={handleLoadSavedSearch}
                onRefresh={loadSavedSearches}
                variant="dropdown"
              />
            )}
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm",
                tier === "professional" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                tier === "enterprise" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                tier === "standard" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                tier === "basic" && "bg-primary/10 text-primary border-primary/30"
              )}
            >
              {tier === "professional" && <Crown className="h-3.5 w-3.5 mr-1" />}
              {tier === "enterprise" && <Zap className="h-3.5 w-3.5 mr-1" />}
              {tierDefinition.name}
            </Badge>
          </div>
        }
      />

      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-6">
          {/* Query Usage Banner */}
          {!canSearch && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Daily query limit reached</p>
                      <p className="text-sm text-muted-foreground">
                        You've used all {tierDefinition.queriesPerDay} queries for today. Resets at midnight.
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="default" size="sm" className="rounded-full">
                    <Link href="/pricing">Upgrade Plan</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Stats Card */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Queries today:</span>
                    <span className={cn(
                      "font-semibold",
                      !canSearch && "text-destructive"
                    )}>
                      {queriesUsedToday} / {tierDefinition.queriesPerDay === "unlimited" ? "∞" : tierDefinition.queriesPerDay}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Forecast horizon:</span>
                    <span className="font-semibold">{maxHorizonDays} days</span>
                  </div>
                </div>
                {tier === "basic" && (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/pricing" className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade for more
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Location Search with Autocomplete */}
                <div className="flex-1 flex gap-2 relative">
                  <div className="flex-1 relative" data-autocomplete-container>
                    <Input
                      placeholder="Search city or airport (e.g., Tel Aviv, JFK)"
                      value={location}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCitySearch()}
                      onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                      className="flex-1"
                      disabled={loading || !canSearch}
                    />
                    {/* Autocomplete Dropdown */}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
                        <div className="p-1">
                          {locationSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocationSelect(suggestion);
                              }}
                              className="flex items-start gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm">{suggestion.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {suggestion.displayName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleCitySearch} 
                    disabled={loading || !location.trim() || !canSearch}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Date Picker */}
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                        disabled={loading}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        defaultMonth={selectedDate}
                        fromDate={new Date()}
                        toDate={maxDate}
                        disabled={(date) => {
                          const daysFromNow = differenceInDays(date, new Date());
                          return daysFromNow > maxHorizonDays || daysFromNow < 0;
                        }}
                        initialFocus
                      />
                      {tier !== "enterprise" && (
                        <div className="px-4 pb-3 pt-1 border-t">
                          <p className="text-xs text-muted-foreground">
                            Dates beyond {maxHorizonDays} days require{" "}
                            <Link href="/pricing" className="text-primary hover:underline">
                              plan upgrade
                            </Link>
                          </p>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
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
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {weatherData.cityName || 'Selected Location'}
                  </CardTitle>
                  {lastSearchCoords && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="gap-2"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Save Search
                    </Button>
                  )}
                </div>
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
                {canSearch 
                  ? "Click anywhere on the map to view the forecast for that location"
                  : "Upgrade your plan to perform more queries today"
                }
              </p>
            </CardContent>
          </Card>

          {/* Tier Upgrade Prompt */}
          {tier === "basic" && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-blue-500/5">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Unlock More with Standard</h3>
                      <p className="text-sm text-muted-foreground">
                        Get 50 queries/day, 30-day forecasts, and probabilistic insights
                      </p>
                    </div>
                  </div>
                  <Button asChild className="rounded-full">
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tier === "standard" && (
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Go Professional</h3>
                      <p className="text-sm text-muted-foreground">
                        Unlock 200 queries/day, 180-day horizon, exports, and email alerts
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-full border-purple-500/50 text-purple-600 hover:bg-purple-500/10">
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      {lastSearchCoords && weatherData && (
        <SaveSearchDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          searchData={{
            location: weatherData.cityName || location || "Unknown Location",
            lat: lastSearchCoords.lat,
            lon: lastSearchCoords.lon,
            displayName: weatherData.displayName,
            dayOfYear: dayOfYear,
            resolution: "daily",
            forecastType: "standard",
          }}
          currentSavedCount={savedSearches.length}
          onSaveSuccess={loadSavedSearches}
        />
      )}
    </div>
  );
}

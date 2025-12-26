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
import { Search, Calendar, MapPin, Thermometer, Filter, BookmarkPlus, Bookmark, Lock, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import { fetchSavedSearches, createSavedSearch, type SavedSearch } from "@/lib/api";
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
  const { tierDefinition } = useTier();
  
  // Temperature range (average)
  const [minTemp, setMinTemp] = useState<string>("");
  const [maxTemp, setMaxTemp] = useState<string>("");

  // Max temperature range
  const [minMaxTemp, setMinMaxTemp] = useState<string>("");
  const [maxMaxTemp, setMaxMaxTemp] = useState<string>("");

  // Date range
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2025, 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(2025, 0, 31));

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
      
      await createSavedSearch({
        name: searchName.trim(),
        location: `Temp: ${minTemp || "any"}°C - ${maxTemp || "any"}°C`,
        lat: refLat,
        lon: refLon,
        displayName: `${format(startDate!, "MMM d")} - ${format(endDate!, "MMM d")}, ${minTemp || "any"}°C to ${maxTemp || "any"}°C`,
        dayOfYear: getDayOfYearFromDate(startDate!),
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
    if (!minTemp && !maxTemp && !minMaxTemp && !maxMaxTemp) {
      setError("Please enter at least one temperature parameter");
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
        ...(minMaxTemp && { minMaxTemp }),
        ...(maxMaxTemp && { maxMaxTemp }),
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
              {/* Average Temperature Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-primary" />
                  Average Temperature Range (°C)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minTemp" className="text-sm text-muted-foreground">
                      Minimum Avg Temp
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
                      Maximum Avg Temp
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

              {/* Max Temperature Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  Maximum Temperature Range (°C)
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="minMaxTemp" className="text-sm text-muted-foreground">
                      Minimum Max Temp
                    </Label>
                    <Input
                      id="minMaxTemp"
                      type="number"
                      placeholder="e.g., 20"
                      value={minMaxTemp}
                      onChange={(e) => setMinMaxTemp(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="maxMaxTemp" className="text-sm text-muted-foreground">
                      Maximum Max Temp
                    </Label>
                    <Input
                      id="maxMaxTemp"
                      type="number"
                      placeholder="e.g., 35"
                      value={maxMaxTemp}
                      onChange={(e) => setMaxMaxTemp(e.target.value)}
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
                          <div className="flex gap-2 items-center">
                            <p className="text-sm font-semibold text-primary">
                              Avg: {result.temperature.toFixed(1)}°C
                            </p>
                            {result.maxTemperature && (
                              <p className="text-sm font-semibold text-orange-500">
                                Max: {result.maxTemperature.toFixed(1)}°C
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
                    {startDate ? format(startDate, "MMM d") : "Start"} – {endDate ? format(endDate, "MMM d") : "End"}, 2025
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


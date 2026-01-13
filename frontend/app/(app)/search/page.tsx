"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Calendar, Thermometer, Grid3x3, AlertTriangle, Zap, Crown, Clock, Bookmark, BookmarkPlus, Droplets, Snowflake, Sun, Wind, TrendingUp } from "lucide-react";
import { geocodeLocation, searchLocationSuggestions, type LocationSuggestion } from "@/lib/geocoding";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { getDayOfYearFromDate, getDateFromDayOfYear } from "@/lib/format";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import dynamic from "next/dynamic";
import { fetchSavedSearches, markSearchAsUsed, type SavedSearch } from "@/lib/api";
import { saveSearchResult, getSearchResultById } from "@/lib/resultsStorageService";
import { SaveSearchDialog } from "@/components/shared/SaveSearchDialog";
import { SavedSearchesList } from "@/components/shared/SavedSearchesList";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  maxTemperature?: number;
  minTemperature?: number;
  precipitationSum?: number;
  snowfallAmount?: number;
  solarRadiation?: number;
  windSpeed?: number;
  windDirection?: number;
  dayOfYear: number;
  date?: string; // ISO date string
  cityName?: string;
  displayName?: string;
  searchedLocation?: { lat: number; lon: number };
  isForecastRange?: boolean; // For multi-day forecasts
  totalDays?: number; // Total days in range
  dayNumber?: number; // Current day number in range
}

function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Format day of year (1-365) as a readable date string
 * @param dayOfYear - Day of year (1-365)
 * @returns Formatted date string (e.g., "Jan 15")
 */
function getDayOfYearDate(dayOfYear: number): string {
  const date = new Date(2025, 0, dayOfYear);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Convert wind direction in degrees to compass direction label
 * @param degrees - Wind direction in degrees (0-360)
 * @returns Compass direction label (e.g., "N", "NE", "SW")
 */
function getWindDirectionLabel(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert solar radiation from J/m² to kWh/m² for display
 * Raw data is stored in J/m² (cumulative daily solar radiation)
 * Display formula: kWh/m² = J/m² / 3,600,000
 */
function formatSolarRadiation(joules: number | undefined): { 
  value: string; 
  whValue: string; 
  label: string; 
  labelColor: string;
  percent: number;
} {
  if (joules === undefined || joules === null) {
    return { value: '--', whValue: '--', label: 'No data', labelColor: 'text-muted-foreground', percent: 0 };
  }
  if (joules === 0) {
    return { value: '0', whValue: '0', label: 'Night/None', labelColor: 'text-slate-500', percent: 0 };
  }
  // Convert J/m² to kWh/m²
  const kwhPerM2 = joules / 3_600_000;
  // Convert J/m² to Wh/m² for secondary display
  const whPerM2 = joules / 3600;
  
  // Qualitative thresholds (kWh/m² daily totals)
  // Low: < 2 kWh/m², Moderate: 2-5 kWh/m², High: 5-7 kWh/m², Very High: > 7 kWh/m²
  let label: string;
  let labelColor: string;
  let percent: number;
  
  if (kwhPerM2 < 2) {
    label = 'Low';
    labelColor = 'text-slate-500';
    percent = (kwhPerM2 / 2) * 25;
  } else if (kwhPerM2 < 5) {
    label = 'Moderate';
    labelColor = 'text-amber-600';
    percent = 25 + ((kwhPerM2 - 2) / 3) * 35;
  } else if (kwhPerM2 < 7) {
    label = 'High';
    labelColor = 'text-orange-500';
    percent = 60 + ((kwhPerM2 - 5) / 2) * 25;
  } else {
    label = 'Very High';
    labelColor = 'text-red-500';
    percent = Math.min(100, 85 + ((kwhPerM2 - 7) / 3) * 15);
  }
  
  return {
    value: kwhPerM2.toFixed(2),
    whValue: whPerM2.toFixed(0),
    label,
    labelColor,
    percent: Math.min(100, Math.max(0, percent))
  };
}

/**
 * Generate a dynamic weather summary sentence
 */
function generateWeatherSummary(data: WeatherData): string {
  const parts: string[] = [];
  
  // Temperature description
  const temp = data.temperature;
  let tempDesc: string;
  if (temp < 0) tempDesc = 'Freezing';
  else if (temp < 10) tempDesc = 'Cold';
  else if (temp < 18) tempDesc = 'Cool';
  else if (temp < 25) tempDesc = 'Mild';
  else if (temp < 32) tempDesc = 'Warm';
  else tempDesc = 'Hot';
  parts.push(`${tempDesc} day`);
  
  // Solar radiation
  if (data.solarRadiation !== undefined) {
    const solar = formatSolarRadiation(data.solarRadiation);
    if (solar.label !== 'No data' && solar.label !== 'Night/None') {
      parts.push(`${solar.label.toLowerCase()} solar exposure`);
    }
  }
  
  // Precipitation
  if (data.precipitationSum !== undefined && data.precipitationSum > 0) {
    if (data.precipitationSum < 2.5) parts.push('light precipitation');
    else if (data.precipitationSum < 7.5) parts.push('moderate precipitation');
    else parts.push('heavy precipitation');
  }
  
  // Snowfall
  if (data.snowfallAmount !== undefined && data.snowfallAmount > 0) {
    if (data.snowfallAmount < 5) parts.push('light snow');
    else if (data.snowfallAmount < 15) parts.push('moderate snow');
    else parts.push('heavy snow');
  }
  
  // Wind
  if (data.windSpeed !== undefined && data.windSpeed > 0) {
    const windKmh = data.windSpeed * 3.6;
    if (windKmh < 12) parts.push('calm winds');
    else if (windKmh < 30) parts.push('light breeze');
    else if (windKmh < 50) parts.push('moderate wind');
    else parts.push('strong wind');
  }
  
  // Join with proper grammar
  if (parts.length === 1) return parts[0] + '.';
  if (parts.length === 2) return parts.join(' with ') + '.';
  const last = parts.pop();
  return parts.join(', ') + ', and ' + last + '.';
}

export default function SearchPage() {
  const [location, setLocation] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [dayOfYear, setDayOfYear] = useState(getCurrentDayOfYear());
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [multiDayData, setMultiDayData] = useState<any[]>([]); // Store multi-day forecast results
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // Track selected day for display
  
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

  // Restore search from Results Workspace or Saved Searches
  useEffect(() => {
    const restoreSearch = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const restoreId = searchParams.get('restoreId');
      const locationParam = searchParams.get('location');
      const latParam = searchParams.get('lat');
      const lonParam = searchParams.get('lon');
      const dayParam = searchParams.get('day');
      
      // Handle Results Workspace restore
      if (restoreId) {
        const result = getSearchResultById(restoreId);
        if (result && result.query) {
          // Populate form fields
          setLocation(result.query.location || '');
          
          // Restore date range
          let restoredDateRange: { from: Date; to?: Date } | undefined;
          if (result.query.date) {
            const date = new Date(result.query.date);
            restoredDateRange = { from: date, to: date };
          } else if (result.query.startDate && result.query.endDate) {
            restoredDateRange = { 
              from: new Date(result.query.startDate), 
              to: new Date(result.query.endDate) 
            };
          }
          
          // Set date range state
          if (restoredDateRange) {
            setDateRange(restoredDateRange);
          }
          
          // Execute search with stored coordinates and explicit date range
          // Pass dateRange directly to avoid race conditions
          if (result.query.lat && result.query.lon && restoredDateRange) {
            await executeSearch(
              result.query.lat, 
              result.query.lon, 
              result.query.location, 
              result.query.displayName || result.query.location,
              restoredDateRange
            );
          }
          
          // Clean URL after successful restore
          window.history.replaceState({}, '', '/search');
        }
      }
      // Handle Saved Searches restore (traditional query params)
      else if (locationParam && latParam && lonParam && dayParam) {
        const lat = parseFloat(latParam);
        const lon = parseFloat(lonParam);
        const day = parseInt(dayParam);
        
        // Validate parsed values
        if (isNaN(lat) || isNaN(lon) || isNaN(day)) {
          return;
        }
        
        // Populate location
        setLocation(locationParam);
        
        // Convert day of year to date
        const date = getDateFromDayOfYear(day);
        const restoredDateRange = { from: date, to: date };
        setDateRange(restoredDateRange);
        setDayOfYear(day);
        
        // Execute search with coordinates and explicit date range
        await executeSearch(lat, lon, locationParam, locationParam, restoredDateRange);
        
        // Clean URL after successful restore
        window.history.replaceState({}, '', '/search');
      }
    };
    
    restoreSearch();
  }, []);

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
  const executeSearch = async (
    lat: number, 
    lon: number, 
    cityName?: string, 
    displayName?: string,
    overrideDateRange?: { from: Date; to?: Date }
  ) => {
    // Use override date range if provided, otherwise use state
    const effectiveDateRange = overrideDateRange || dateRange;
    
    // Check if dates are selected
    if (!effectiveDateRange.from) {
      toast({
        title: "Date required",
        description: "Please select a date or date range from the calendar",
        variant: "destructive",
      });
      return;
    }

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
    const selectedDate = effectiveDateRange.from;
    const endDate = effectiveDateRange.to || effectiveDateRange.from;
    
    const daysFromNow = differenceInDays(endDate, new Date());
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
      // Format dates as YYYY-MM-DD
      const startDateStr = format(selectedDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      // Check if it's a single-day or multi-day query
      const isSingleDay = selectedDate.getTime() === endDate.getTime();
      
      if (isSingleDay) {
        // Use the existing single-day API
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
        
        // Auto-save search result
        try {
          saveSearchResult({
            searchType: 'location',
            query: {
              location: displayName,
              lat,
              lon,
              dayOfYear,
              date: format(selectedDate, 'yyyy-MM-dd'),
            },
            summary: {
              location: displayName,
              dateRange: {
                start: format(selectedDate, "MMM d, yyyy"),
                end: format(selectedDate, "MMM d, yyyy"),
              },
              avgTemp: data.temperature,
            },
            resultData: data,
          });
        } catch (saveError) {
          console.error('Failed to save search result:', saveError);
        }
        
        toast({
          title: "Forecast loaded",
          description: queriesRemaining === "unlimited" 
            ? "Unlimited queries available"
            : `${typeof queriesRemaining === 'number' ? queriesRemaining - 1 : queriesRemaining} queries remaining today`,
        });
      } else {
        // Use the new forecast API for date ranges
        const response = await fetch(
          `/api/weather/forecast?lat=${lat}&lon=${lon}&startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch weather forecast');
        }

        const data = await response.json();

        // For multi-day queries, store all days and show the first day in the current display
        const dayCount = data.results.length;
        
        // Enrich each day with additional metadata
        const enrichedResults = (data.results || []).map((dayData: any, index: number) => ({
          ...dayData,
          cityName: cityName,
          displayName: displayName,
          searchedLocation: { lat, lon },
          dayNumber: index + 1,
        }));
        
        // Store all multi-day data for visualization
        setMultiDayData(enrichedResults);
        setSelectedDayIndex(0);
        
        // Store the full forecast data in localStorage temporarily
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastForecastData', JSON.stringify({
            ...data,
            cityName,
            displayName,
            isForecastRange: true,
            enrichedResults,
          }));
        }

        // Show the first day's data in the current view
        if (enrichedResults.length > 0) {
          setWeatherData({
            ...enrichedResults[0],
            isForecastRange: true,
            totalDays: dayCount,
          });
        }
        
        // Auto-save multi-day search result
        try {
          saveSearchResult({
            searchType: 'location',
            query: {
              location: displayName,
              lat,
              lon,
              startDate: startDateStr,
              endDate: endDateStr,
              dayCount,
            },
            summary: {
              location: displayName,
              dateRange: {
                start: format(selectedDate, "MMM d, yyyy"),
                end: format(endDate, "MMM d, yyyy"),
              },
              matchCount: dayCount,
            },
            resultData: {
              results: enrichedResults,
              dayCount,
            },
          });
        } catch (saveError) {
          console.error('Failed to save search result:', saveError);
        }
        
        toast({
          title: "Multi-day forecast loaded",
          description: `Retrieved ${dayCount}-day forecast from ${format(selectedDate, 'MMM d')} to ${format(endDate, 'MMM d')}`,
        });
      }

      // Store last search coordinates for saving
      setLastSearchCoords({ lat, lon });

      // Increment query usage after successful search
      incrementQueryUsage();
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
    
    // Get date from saved search
    let searchDate: Date | undefined;
    if (search.dayOfYear) {
      searchDate = getDateFromDayOfYear(search.dayOfYear);
      setDateRange({ from: searchDate, to: searchDate });
      setDayOfYear(search.dayOfYear);
    }

    // Mark the search as used
    await markSearchAsUsed(search.id);
    await loadSavedSearches();

    // Execute the search with explicit date to bypass async state issues
    if (searchDate) {
      await executeSearch(
        search.lat, 
        search.lon, 
        search.location, 
        search.displayName,
        { from: searchDate, to: searchDate }
      );
    } else {
      await executeSearch(search.lat, search.lon, search.location, search.displayName);
    }
  };

  // Handle location selection from suggestions
  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.displayName || suggestion.name);
    setShowSuggestions(false);
    // Store coordinates for later use when user clicks Search
    setLastSearchCoords({ lat: suggestion.lat, lon: suggestion.lon });
  };

  const handleCitySearch = async () => {
    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }

    if (!dateRange.from) {
      setError("Please select a date or date range");
      toast({
        title: "Date required",
        description: "Please select a date or date range from the calendar",
        variant: "destructive",
      });
      return;
    }

    setShowSuggestions(false);

    try {
      // Check if we have stored coordinates from suggestion selection
      if (lastSearchCoords) {
        await executeSearch(lastSearchCoords.lat, lastSearchCoords.lon, location, location);
      } else {
        // Try to geocode the location
        const { lat, lon, displayName } = await geocodeLocation(location);
        await executeSearch(lat, lon, location, displayName);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find location');
      toast({
        title: "Location not found",
        description: "Please try a different search term",
        variant: "destructive",
      });
    }
  };

  // Handle date range change from calendar
  const handleDateRangeChange = (range: { from: Date | undefined; to?: Date | undefined } | undefined) => {
    if (!range?.from) return;
    
    // Check if start date is within horizon limit
    const daysFromNow = differenceInDays(range.from, new Date());
    if (daysFromNow > maxHorizonDays) {
      toast({
        title: "Date beyond horizon",
        description: `Upgrade to access forecasts beyond ${maxHorizonDays} days.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if end date is within horizon limit
    if (range.to) {
      const endDaysFromNow = differenceInDays(range.to, new Date());
      if (endDaysFromNow > maxHorizonDays) {
        toast({
          title: "Date beyond horizon",
          description: `Upgrade to access forecasts beyond ${maxHorizonDays} days.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setDateRange({ from: range.from, to: range.to || range.from });
    const newDayOfYear = getDayOfYearFromDate(range.from);
    setDayOfYear(newDayOfYear);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Calculate range summary statistics for multi-day forecasts
  const rangeSummary = useMemo(() => {
    if (multiDayData.length === 0) return null;

    const temps = multiDayData.map((d) => d.temperature).filter((t) => t !== undefined);
    const maxTemps = multiDayData.map((d) => d.maxTemperature).filter((t) => t !== undefined);
    const minTemps = multiDayData.map((d) => d.minTemperature).filter((t) => t !== undefined);
    const precip = multiDayData.map((d) => d.precipitationSum || 0);
    const snow = multiDayData.map((d) => d.snowfallAmount || 0);
    const wind = multiDayData.map((d) => d.windSpeed || 0);
    const solar = multiDayData.map((d) => d.solarRadiation || 0);

    return {
      avgTemp: temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : "--",
      minTemp: minTemps.length > 0 ? Math.min(...minTemps).toFixed(1) : "--",
      maxTemp: maxTemps.length > 0 ? Math.max(...maxTemps).toFixed(1) : "--",
      totalPrecip: (precip.reduce((a, b) => a + b, 0)).toFixed(1),
      totalSnow: (snow.reduce((a, b) => a + b, 0)).toFixed(1),
      avgWind: wind.length > 0 ? ((wind.reduce((a, b) => a + b, 0) / wind.length) * 3.6).toFixed(0) : "--",
      totalSolar: (solar.reduce((a, b) => a + b, 0) / 3_600_000).toFixed(2), // Convert J/m² to kWh/m²
      dayCount: multiDayData.length,
    };
  }, [multiDayData]);

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

  // Prepare chart data for multi-day visualization
  const chartData = useMemo(() => {
    if (multiDayData.length === 0) return [];
    
    return multiDayData.map((day, index) => ({
      date: format(new Date(day.date || getDateFromDayOfYear(day.dayOfYear)), 'MMM d'),
      day: `Day ${index + 1}`,
      temperature: parseFloat((day.temperature || 0).toFixed(1)),
      minTemp: parseFloat((day.minTemperature || 0).toFixed(1)),
      maxTemp: parseFloat((day.maxTemperature || 0).toFixed(1)),
      precipitation: parseFloat((day.precipitationSum || 0).toFixed(1)),
      snowfall: parseFloat((day.snowfallAmount || 0).toFixed(1)),
      windSpeed: parseFloat(((day.windSpeed || 0) * 3.6).toFixed(1)),
      solarRadiation: parseFloat(((day.solarRadiation || 0) / 3_600_000).toFixed(2)),
    }));
  }, [multiDayData]);

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
                            <button
                              key={index}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocationSelect(suggestion);
                              }}
                              className="w-full flex items-start gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm">{suggestion.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {suggestion.displayName}
                                </span>
                              </div>
                            </button>
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

                {/* Date Range Picker - Single Calendar */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal min-w-[240px]",
                        !dateRange.from && "text-muted-foreground border-primary/50"
                      )}
                      disabled={loading}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange.from ? dateRange : undefined}
                      onSelect={handleDateRangeChange}
                      defaultMonth={new Date()}
                      fromDate={new Date()}
                      toDate={maxDate}
                      disabled={(date) => {
                        const daysFromNow = differenceInDays(date, new Date());
                        return daysFromNow > maxHorizonDays || daysFromNow < 0;
                      }}
                      numberOfMonths={2}
                      initialFocus
                    />
                    <div className="px-4 pb-3 pt-2 border-t bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-2">
                        💡 Click a date for single day, or click and drag to select a range
                      </p>
                      {tier !== "enterprise" && (
                        <p className="text-xs text-muted-foreground">
                          Dates beyond {maxHorizonDays} days require{" "}
                          <Link href="/pricing" className="text-primary hover:underline">
                            plan upgrade
                          </Link>
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Date Range Helper Text */}
              {dateRange.from && dateRange.to && (
                <div className="text-sm text-muted-foreground mt-2">
                  {dateRange.from.getTime() === dateRange.to.getTime() ? (
                    <span>Single-day query: {format(dateRange.from, "MMM d, yyyy")}</span>
                  ) : (
                    <span>
                      {differenceInDays(dateRange.to, dateRange.from) + 1}-day range: {format(dateRange.from, "MMM d")} → {format(dateRange.to, "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              )}
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
              <CardContent className="space-y-6">
                {/* Multi-day Forecast Banner */}
                {weatherData.isForecastRange && weatherData.totalDays && weatherData.totalDays > 1 && (
                  <>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-blue-500/10 border border-blue-500/30">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">
                            Multi-Day Forecast ({weatherData.totalDays} days)
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Comprehensive {weatherData.totalDays}-day forecast with trends and aggregated statistics.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Range Summary Statistics */}
                    {rangeSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Avg Temp</p>
                          <p className="text-lg font-semibold text-red-600">{rangeSummary.avgTemp}°C</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Max</p>
                          <p className="text-lg font-semibold text-orange-600">{rangeSummary.maxTemp}°C</p>
                        </div>
                        <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Min</p>
                          <p className="text-lg font-semibold text-sky-600">{rangeSummary.minTemp}°C</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Total Precip</p>
                          <p className="text-lg font-semibold text-blue-600">{rangeSummary.totalPrecip} mm</p>
                        </div>
                        <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Avg Wind</p>
                          <p className="text-lg font-semibold text-indigo-600">{rangeSummary.avgWind} km/h</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Total Solar</p>
                          <p className="text-lg font-semibold text-amber-600">{rangeSummary.totalSolar} kWh/m²</p>
                        </div>
                      </div>
                    )}

                    {/* Tabs for different visualization types */}
                    <Tabs defaultValue="trends" className="w-full space-y-4">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="trends" className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="hidden sm:inline">Trends</span>
                        </TabsTrigger>
                        <TabsTrigger value="precipitation" className="flex items-center gap-1">
                          <Droplets className="h-4 w-4" />
                          <span className="hidden sm:inline">Precip</span>
                        </TabsTrigger>
                        <TabsTrigger value="wind" className="flex items-center gap-1">
                          <Wind className="h-4 w-4" />
                          <span className="hidden sm:inline">Wind</span>
                        </TabsTrigger>
                        <TabsTrigger value="breakdown" className="flex items-center gap-1">
                          <Grid3x3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Days</span>
                        </TabsTrigger>
                      </TabsList>

                      {/* Temperature Trends */}
                      <TabsContent value="trends" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Temperature Trends</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value: any) => value.toFixed(1)} />
                                <Legend />
                                <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Avg Temp" />
                                <Line type="monotone" dataKey="maxTemp" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Max Temp" />
                                <Line type="monotone" dataKey="minTemp" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" name="Min Temp" />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Precipitation & Snowfall */}
                      <TabsContent value="precipitation" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Precipitation & Snowfall</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis label={{ value: 'Precipitation (mm)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value: any) => value.toFixed(1)} />
                                <Legend />
                                <Bar dataKey="precipitation" fill="#3b82f6" name="Precipitation (mm)" />
                                <Bar dataKey="snowfall" fill="#06b6d4" name="Snowfall (mm)" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Wind Speed */}
                      <TabsContent value="wind" className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Wind Speed</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis label={{ value: 'Wind Speed (km/h)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value: any) => value.toFixed(1)} />
                                <Legend />
                                <Bar dataKey="windSpeed" fill="#06b6d4" name="Wind Speed (km/h)" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Day-by-Day Breakdown */}
                      <TabsContent value="breakdown" className="space-y-4">
                        <div className="flex gap-2 pb-4 overflow-x-auto">
                          {multiDayData.map((day, index) => (
                            <Button
                              key={index}
                              variant={selectedDayIndex === index ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedDayIndex(index)}
                              className="shrink-0"
                            >
                              Day {index + 1}
                            </Button>
                          ))}
                        </div>
                        {selectedDayIndex < multiDayData.length && (
                          <Card>
                            <CardHeader>
                              <CardTitle>
                                {format(new Date(multiDayData[selectedDayIndex].date || getDateFromDayOfYear(multiDayData[selectedDayIndex].dayOfYear)), 'EEEE, MMMM d, yyyy')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Temperature</p>
                                  <p className="text-xl font-semibold text-red-600">{multiDayData[selectedDayIndex].temperature?.toFixed(1)}°C</p>
                                </div>
                                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Max</p>
                                  <p className="text-xl font-semibold text-orange-600">{multiDayData[selectedDayIndex].maxTemperature?.toFixed(1) || '--'}°C</p>
                                </div>
                                <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Min</p>
                                  <p className="text-xl font-semibold text-sky-600">{multiDayData[selectedDayIndex].minTemperature?.toFixed(1) || '--'}°C</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Precipitation</p>
                                  <p className="text-xl font-semibold text-blue-600">{(multiDayData[selectedDayIndex].precipitationSum || 0).toFixed(1)} mm</p>
                                </div>
                                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Wind Speed</p>
                                  <p className="text-xl font-semibold text-indigo-600">{((multiDayData[selectedDayIndex].windSpeed || 0) * 3.6).toFixed(0)} km/h</p>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Solar Radiation</p>
                                  <p className="text-xl font-semibold text-amber-600">{((multiDayData[selectedDayIndex].solarRadiation || 0) / 3_600_000).toFixed(2)} kWh/m²</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  </>
                )}

                {/* Dynamic Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
                  <p className="text-base font-medium text-foreground">
                    {generateWeatherSummary(weatherData)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getDayOfYearDate(weatherData.dayOfYear)} • Grid {weatherData.gridIndex}
                  </p>
                </div>

                {/* Primary Metrics - Temperature & Solar */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Primary Conditions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Avg Temperature - Hero card */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Thermometer className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Average</p>
                      </div>
                      <p className="text-4xl font-bold text-primary tracking-tight">
                        {weatherData.temperature.toFixed(1)}<span className="text-2xl">°C</span>
                      </p>
                    </div>
                    {/* Max Temperature */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-2 border-orange-500/30 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Thermometer className="h-5 w-5 text-orange-500" />
                        <p className="text-sm font-medium text-muted-foreground">Maximum</p>
                      </div>
                      <p className="text-4xl font-bold text-orange-500 tracking-tight">
                        {weatherData.maxTemperature ? weatherData.maxTemperature.toFixed(1) : '--'}<span className="text-2xl">°C</span>
                      </p>
                    </div>
                    {/* Min Temperature */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border-2 border-sky-500/30 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Thermometer className="h-5 w-5 text-sky-500" />
                        <p className="text-sm font-medium text-muted-foreground">Minimum</p>
                      </div>
                      <p className="text-4xl font-bold text-sky-500 tracking-tight">
                        {weatherData.minTemperature ? weatherData.minTemperature.toFixed(1) : '--'}<span className="text-2xl">°C</span>
                      </p>
                    </div>
                    {/* Solar Radiation - Enhanced */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-2 border-amber-500/30 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Sun className="h-5 w-5 text-amber-500" />
                          <p className="text-sm font-medium text-muted-foreground">Solar</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 ${formatSolarRadiation(weatherData.solarRadiation).labelColor}`}>
                          {formatSolarRadiation(weatherData.solarRadiation).label}
                        </span>
                      </div>
                      <p className="text-4xl font-bold text-amber-500 tracking-tight">
                        {formatSolarRadiation(weatherData.solarRadiation).value}
                        <span className="text-lg font-normal ml-1">kWh/m²</span>
                      </p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-amber-200/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${formatSolarRadiation(weatherData.solarRadiation).percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {weatherData.solarRadiation !== undefined && weatherData.solarRadiation > 0 && `${formatSolarRadiation(weatherData.solarRadiation).whValue} Wh/m²`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secondary Metrics - Precipitation, Snow, Wind */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Weather Conditions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Precipitation */}
                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-medium text-muted-foreground">Precipitation</p>
                      </div>
                      <p className="text-2xl font-semibold text-blue-600">
                        {weatherData.precipitationSum !== undefined ? weatherData.precipitationSum.toFixed(1) : '--'}
                        <span className="text-sm font-normal text-muted-foreground ml-1">mm</span>
                      </p>
                    </div>
                    {/* Snowfall */}
                    <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Snowflake className="h-4 w-4 text-indigo-500" />
                        <p className="text-xs font-medium text-muted-foreground">Snowfall</p>
                      </div>
                      <p className="text-2xl font-semibold text-indigo-600">
                        {weatherData.snowfallAmount !== undefined ? weatherData.snowfallAmount.toFixed(1) : '--'}
                        <span className="text-sm font-normal text-muted-foreground ml-1">mm</span>
                      </p>
                    </div>
                    {/* Wind */}
                    <div className="p-4 rounded-lg bg-teal-500/5 border border-teal-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind className="h-4 w-4 text-teal-500" />
                        <p className="text-xs font-medium text-muted-foreground">Wind</p>
                      </div>
                      <p className="text-2xl font-semibold text-teal-600">
                        {weatherData.windSpeed !== undefined ? (weatherData.windSpeed * 3.6).toFixed(0) : '--'}
                        <span className="text-sm font-normal text-muted-foreground ml-1">km/h</span>
                      </p>
                      {weatherData.windDirection !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {getWindDirectionLabel(weatherData.windDirection)} ({weatherData.windSpeed?.toFixed(1)} m/s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{getDayOfYearDate(weatherData.dayOfYear)}</span>
                    <span className="text-xs">(Day {weatherData.dayOfYear})</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Grid3x3 className="h-4 w-4" />
                    <span>Grid #{weatherData.gridIndex}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="font-mono text-xs">
                      {weatherData.location.lat.toFixed(2)}°, {weatherData.location.lon.toFixed(2)}°
                    </span>
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

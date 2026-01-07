"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GeoMap } from "@/components/shared/GeoMap";
import type { SearchFormValues } from "@/types/search";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  name: string;
  lat: number;
  lon: number;
  display_name: string;
}

interface SearchFiltersProps {
  form: UseFormReturn<SearchFormValues>;
  presets: string[];
  onSubmit: (values: SearchFormValues) => void;
  queryCost: number;
  queryLimit: number | "unlimited";
  isSubmitting: boolean;
  availability?: {
    forecast?: Partial<Record<SearchFormValues["forecastType"], boolean>>;
    outputs?: Partial<Record<SearchFormValues["output"], boolean>>;
  };
  alertsEnabled?: boolean;
  maxHorizonDays?: number;
}

export function SearchFilters({ form, presets, onSubmit, queryCost, queryLimit, isSubmitting, availability, alertsEnabled = true, maxHorizonDays = 365 }: SearchFiltersProps) {
  const { register, handleSubmit, setValue, watch } = form;
  const resolution = watch("resolution");
  const forecastType = watch("forecastType");
  const output = watch("output");
  const units = watch("units");
  const autoAlert = watch("autoAlert");
  const location = watch("location");
  const startDate = watch("range.start");
  const endDate = watch("range.end");
  const remaining = queryLimit === "unlimited" ? Infinity : queryLimit - queryCost;
  const canDownload = output === "download" ? queryLimit === "unlimited" || remaining > 0 : true;
  const forecastAvailability = availability?.forecast ?? {};
  const outputAvailability = availability?.outputs ?? {};

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Date range validation
  const [dateError, setDateError] = useState<string>("");
  const [horizonError, setHorizonError] = useState<string>("");

  // Validate date range whenever start or end date changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setDateError("Both start and end dates are required");
      setHorizonError("");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if end >= start
    if (end < start) {
      setDateError("End date must be on or after start date");
      setHorizonError("");
      return;
    }

    setDateError("");

    // Calculate range in days
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check horizon limit
    if (rangeDays > maxHorizonDays) {
      setHorizonError(`Your plan allows up to ${maxHorizonDays} days. Please shorten the range or upgrade.`);
    } else {
      setHorizonError("");
    }
  }, [startDate, endDate, maxHorizonDays]);

  // Calculate if the form is valid for submission
  const hasDateValidationError = Boolean(dateError || horizonError);
  const canSubmitForm = !isSubmitting && !hasDateValidationError && canDownload;

  // Helper text for date range
  const dateRangeHelperText = useMemo(() => {
    if (!startDate || !endDate) return "You can search a range. Set start and end dates.";
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getTime() === end.getTime()) {
      return "Single-day query";
    }
    
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${rangeDays}-day range query`;
  }, [startDate, endDate]);

  // Geocode location when user types
  useEffect(() => {
    if (!location || location.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data as LocationSuggestion[]);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to fetch location suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [location]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setValue("location", suggestion.display_name);
    setValue("latitude", suggestion.lat);
    setValue("longitude", suggestion.lon);
    setSuggestions([]);
    setShowSuggestions(false);
  };
  const resolutionLabels: Record<SearchFormValues["resolution"], string> = {
    daily: "Daily",
    weekly: "Weekly averages",
    monthly: "Monthly summary",
  };
  const forecastLabels: Record<SearchFormValues["forecastType"], string> = {
    standard: "Standard",
    probabilistic: "Probabilistic",
    extreme: "Extreme events",
  };
  const outputLabels: Record<SearchFormValues["output"], string> = {
    table: "Table",
    charts: "Charts",
    download: "Download package",
  };

  const handleMapPosition = useCallback(
    (position: any) => {
      const [lat, lng] = Array.isArray(position) ? position : [position.lat, position.lng];
      setValue("latitude", lat);
      setValue("longitude", lng);
    },
    [setValue]
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-background/80 p-6"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Query parameters</h2>
            <p className="text-sm text-muted-foreground">Select a location, horizon, and forecast configuration.</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-semibold text-primary">Cost: {queryCost} credits</p>
            <p>
              Remaining: {queryLimit === "unlimited" ? "∞" : Math.max(remaining, 0)} / {queryLimit === "unlimited" ? "unlimited" : queryLimit}
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <Input 
                id="location" 
                placeholder="e.g., Tel Aviv, Israel" 
                {...register("location", { required: true })}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-lg shadow-lg z-50">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLocationSelect(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-muted/50 border-b last:border-b-0 text-sm"
                    >
                      <p className="font-medium text-foreground">{suggestion.name}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.display_name}</p>
                    </button>
                  ))}
                </div>
              )}
              {isLoadingSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-lg shadow-lg z-50 px-4 py-2 text-sm text-muted-foreground">
                  Searching locations...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Click on the map to refine coordinates. ({watch("latitude")?.toFixed?.(2) ?? "--"}, {watch("longitude")?.toFixed?.(2) ?? "--"})
            </p>
            <GeoMap
              position={
                watch("latitude") && watch("longitude")
                  ? [Number(watch("latitude")), Number(watch("longitude"))]
                  : undefined
              }
              onPositionChange={handleMapPosition}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" {...register("range.start", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" {...register("range.end", { required: true })} />
            </div>
          </div>
          {/* Date range validation messages */}
          <div className="space-y-2">
            {dateError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {dateError}
              </p>
            )}
            {horizonError && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {horizonError}
              </p>
            )}
            {!dateError && !horizonError && (
              <p className="text-xs text-muted-foreground">
                {dateRangeHelperText}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select value={resolution} onValueChange={(value) => setValue("resolution", value as SearchFormValues["resolution"])}>
                <SelectTrigger>{resolution ? resolutionLabels[resolution] : "Select"}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly averages</SelectItem>
                  <SelectItem value="monthly">Monthly summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forecast Type</Label>
              <Select value={forecastType} onValueChange={(value) => setValue("forecastType", value as SearchFormValues["forecastType"])}>
                <SelectTrigger>{forecastType ? forecastLabels[forecastType] : "Select"}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard" disabled={forecastAvailability.standard === false}>
                    Standard
                  </SelectItem>
                  <SelectItem value="probabilistic" disabled={forecastAvailability.probabilistic === false}>
                    Probabilistic
                  </SelectItem>
                  <SelectItem value="extreme" disabled={forecastAvailability.extreme === false}>
                    Extreme events
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output</Label>
              <Select value={output} onValueChange={(value) => setValue("output", value as SearchFormValues["output"])}>
                <SelectTrigger>{output ? outputLabels[output] : "Select"}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="table" disabled={outputAvailability.table === false}>
                    Table
                  </SelectItem>
                  <SelectItem value="charts" disabled={outputAvailability.charts === false}>
                    Charts
                  </SelectItem>
                  <SelectItem value="download" disabled={outputAvailability.download === false}>
                    Download package
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comfort & Risk presets</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={watch("preset") === preset ? "secondary" : "ghost"}
                  className={cn("rounded-full", watch("preset") === preset && "border border-primary")}
                  onClick={() => setValue("preset", watch("preset") === preset ? null : preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/40 p-4">
              <Label className="text-xs uppercase">Units</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Temperature</span>
                <div className="flex gap-1">
                  {["c", "f"].map((unit) => (
                    <Button
                      key={unit}
                      type="button"
                      variant={units.temperature === unit ? "secondary" : "ghost"}
                      className="rounded-full px-3"
                      onClick={() => setValue("units.temperature", unit as "c" | "f")}
                    >
                      °{unit.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Precipitation</span>
                <div className="flex gap-1">
                  {["mm", "in"].map((unit) => (
                    <Button
                      key={unit}
                      type="button"
                      variant={units.precipitation === unit ? "secondary" : "ghost"}
                      className="rounded-full px-3"
                      onClick={() => setValue("units.precipitation", unit as "mm" | "in")}
                    >
                      {unit}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <div className="flex items-center justify-between text-primary">
                <span className="font-semibold">Query cost</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold">{queryCost} credits</span>
              </div>
              <p className="text-muted-foreground">
                Higher horizons, probabilistic outputs, and download packages increase credit usage. Adjust resolution and presets to stay within your tier limits.
              </p>
              <label className={cn("flex items-center justify-between gap-3 text-xs text-muted-foreground", !alertsEnabled && "opacity-50")}
              >
                <span>Run with auto-alert recommendation</span>
                <Switch
                  checked={Boolean(autoAlert) && alertsEnabled}
                  onCheckedChange={(value) => alertsEnabled && setValue("autoAlert", value)}
                  aria-label="Enable auto-alert recommendation"
                  disabled={!alertsEnabled}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Results reflect probabilistic ranges and extreme event scouting aligned to your plan.
        </p>
        <div className="flex gap-2">
          <Button type="reset" variant="ghost" className="rounded-full" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" className="rounded-full" disabled={!canSubmitForm}>
            {isSubmitting ? "Running query..." : "Run forecast"}
          </Button>
        </div>
      </div>
    </form>
  );
}

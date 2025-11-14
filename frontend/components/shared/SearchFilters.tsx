"use client";

import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GeoMap } from "@/components/shared/GeoMap";
import type { SearchFormValues } from "@/types/search";
import { cn } from "@/lib/utils";

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
}

export function SearchFilters({ form, presets, onSubmit, queryCost, queryLimit, isSubmitting, availability, alertsEnabled = true }: SearchFiltersProps) {
  const { register, handleSubmit, setValue, watch } = form;
  const resolution = watch("resolution");
  const forecastType = watch("forecastType");
  const output = watch("output");
  const units = watch("units");
  const autoAlert = watch("autoAlert");
  const remaining = queryLimit === "unlimited" ? Infinity : queryLimit - queryCost;
  const canDownload = output === "download" ? queryLimit === "unlimited" || remaining > 0 : true;
  const forecastAvailability = availability?.forecast ?? {};
  const outputAvailability = availability?.outputs ?? {};
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
    ([lat, lng]: [number, number]) => {
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
            <Input id="location" placeholder="e.g., Tel Aviv, Israel" {...register("location", { required: true })} />
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
          <Button type="submit" className="rounded-full" disabled={isSubmitting || !canDownload}>
            {isSubmitting ? "Running query..." : "Run forecast"}
          </Button>
        </div>
      </div>
    </form>
  );
}

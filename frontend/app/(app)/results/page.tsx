"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, FileSpreadsheet, FileText, Save, Send, Share2, Lock } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProbabilityBar } from "@/components/shared/ProbabilityBar";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TierGate } from "@/components/shared/TierGate";
import { WeeklyCard } from "@/components/shared/WeeklyCard";
import { ChartPanel } from "@/components/shared/ChartPanel";
import { GeoMap } from "@/components/shared/GeoMap";
import { fetchForecastResult, fetchRecentSearches } from "@/lib/api";
import { formatDate, formatPercent, formatPrecip, formatTemperature } from "@/lib/format";
import { tiers } from "@/lib/tiers";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import { exportAndDownload, getAvailableExportFormats } from "@/lib/export";

function TemperatureTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{formatDate(point.date)}</p>
      <p>Average: {Math.round(point.avgTemp)}°</p>
      <p>Range: {Math.round(point.minTemp)}° – {Math.round(point.maxTemp)}°</p>
    </div>
  );
}

function PrecipTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl border border-border/60 bg-background/90 p-3 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{formatDate(point.date)}</p>
      <p>Volume: {point.precipValue}</p>
      <p>Probability: {formatPercent(point.precipProb, 0)}</p>
    </div>
  );
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");
  const temperatureUnit = (searchParams.get("temp") as "c" | "f") ?? "c";
  const precipUnit = (searchParams.get("precip") as "mm" | "in") ?? "mm";
  const { tier, tierDefinition, canExport, canAccessFeature } = useTier();
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const resultQuery = useQuery({
    queryKey: ["forecast-result", resultId],
    queryFn: async () => {
      if (!resultId) return undefined;
      return fetchForecastResult(resultId);
    },
    enabled: Boolean(resultId),
  });

  const recentSearches = useQuery({ queryKey: ["recent-searches"], queryFn: fetchRecentSearches });

  const searchMeta = useMemo(() => {
    if (!resultId || !recentSearches.data) return undefined;
    return recentSearches.data.find((item) => item.id === resultId);
  }, [recentSearches.data, resultId]);

  const availableExportFormats = getAvailableExportFormats(tier);

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    if (!canExport(format)) {
      toast({
        title: "Export unavailable",
        description: `${format.toUpperCase()} exports require Professional plan or higher`,
        variant: "destructive",
      });
      return;
    }

    if (!resultQuery.data) {
      toast({
        title: "No data to export",
        description: "Please wait for the forecast data to load",
        variant: "destructive",
      });
      return;
    }

    setExporting(format);
    try {
      await exportAndDownload(
        tier,
        format,
        format === "pdf" ? resultQuery.data : resultQuery.data.metrics,
        searchMeta?.location || "forecast",
        { temperatureUnit, precipUnit }
      );
      toast({
        title: "Export complete",
        description: `Your ${format.toUpperCase()} file has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "An error occurred while exporting",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  if (!resultId) {
    return (
      <EmptyState
        title="No result selected"
        description="Run a forecast from the search page to view probabilistic insights, extreme events, and exports."
        action={{ label: "Start new search", href: "/search" }}
        className="rounded-3xl"
      />
    );
  }

  if (resultQuery.isLoading) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-background/70 p-10 text-center text-muted-foreground">
        Loading forecast intelligence…
      </Card>
    );
  }

  if (!resultQuery.data) {
    return (
      <EmptyState
        title="Result unavailable"
        description="We couldn't locate this forecast. Try rerunning the query from the dashboard."
        action={{ label: "Back to search", href: "/search" }}
        className="rounded-3xl"
      />
    );
  }

  const result = resultQuery.data;
  
  // Determine if this is a multi-day range
  const isRangeQuery = result.metrics.length > 1;
  const selectedMetric = result.metrics[selectedDayIndex] || result.metrics[0];
  
  // Calculate range summary (aggregated across all days)
  const rangeSummary = useMemo(() => {
    if (!isRangeQuery || result.metrics.length === 0) return null;
    
    const temps = result.metrics.map(m => m.avgTemp);
    const mins = result.metrics.map(m => m.minTemp);
    const maxs = result.metrics.map(m => m.maxTemp);
    const precips = result.metrics.map(m => m.precipMm);
    const winds = result.metrics.map(m => m.windSpeed);
    
    return {
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      minTemp: Math.min(...mins),
      maxTemp: Math.max(...maxs),
      totalPrecip: precips.reduce((a, b) => a + b, 0),
      avgWind: winds.reduce((a, b) => a + b, 0) / winds.length,
      dayCount: result.metrics.length,
    };
  }, [result.metrics, isRangeQuery]);
  
  const temperatureSeries = result.metrics.map((metric) => ({
    date: metric.date,
    minTemp: temperatureUnit === "f" ? metric.minTemp * 1.8 + 32 : metric.minTemp,
    maxTemp: temperatureUnit === "f" ? metric.maxTemp * 1.8 + 32 : metric.maxTemp,
    avgTemp: temperatureUnit === "f" ? metric.avgTemp * 1.8 + 32 : metric.avgTemp,
  }));

  const precipSeries = result.metrics.map((metric) => ({
    date: metric.date,
    precipValue: formatPrecip(metric.precipMm, precipUnit),
    precipAmount: precipUnit === "in" ? metric.precipMm / 25.4 : metric.precipMm,
    precipProb: metric.precipProb,
  }));

  const stickyActions = (
    <div className="sticky bottom-4 z-30 flex w-full justify-center">
      <div className="flex w-full max-w-3xl items-center justify-between gap-2 rounded-full border border-border/60 bg-background/90 p-3 shadow-[var(--elevation-medium)]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{searchMeta?.location ?? "Custom location"}</span>
          <span aria-hidden>•</span>
          <span>{formatDate(searchMeta ? searchMeta.startDate : result.metrics[0].date)} → {formatDate(searchMeta ? searchMeta.endDate : result.metrics.at(-1)?.date ?? result.metrics[0].date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => toast({ title: "Search saved" })}>
            <Save className="mr-1 h-4 w-4" aria-hidden /> Save search
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => toast({ title: "Share link copied" })}>
            <Share2 className="mr-1 h-4 w-4" aria-hidden /> Share
          </Button>
          
          {/* Alert Button with Tier Gate */}
          {canAccessFeature("alerts") ? (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => toast({ title: "Alert scheduled" })}
            >
              <Send className="mr-1 h-4 w-4" aria-hidden /> Set alert
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-muted-foreground"
              onClick={() => toast({ 
                title: "Alerts locked", 
                description: "Upgrade to Professional to set automated alerts",
                variant: "destructive" 
              })}
            >
              <Lock className="mr-1 h-4 w-4" aria-hidden /> Set alert
            </Button>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                className="rounded-full"
                disabled={availableExportFormats.length === 0 && tier !== "professional" && tier !== "enterprise"}
              >
                <Download className="mr-1 h-4 w-4" aria-hidden /> 
                {exporting ? `Exporting ${exporting.toUpperCase()}...` : "Download"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableExportFormats.length > 0 ? (
                <>
                  {canExport("csv") && (
                    <DropdownMenuItem onClick={() => handleExport("csv")} disabled={exporting !== null}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                  )}
                  {canExport("pdf") && (
                    <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={exporting !== null}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  )}
                  {canExport("excel") && (
                    <DropdownMenuItem onClick={() => handleExport("excel")} disabled={exporting !== null}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export as Excel
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    <Lock className="mr-2 h-4 w-4" />
                    Exports require Professional plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="cursor-pointer">
                      Upgrade to unlock exports
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title={searchMeta?.location ?? "Forecast results"}
        description={
          isRangeQuery
            ? `From ${formatDate(result.metrics[0].date)} to ${formatDate(result.metrics[result.metrics.length - 1].date)} (${result.metrics.length} days)`
            : "Explore probabilistic uncertainty, upcoming extreme events, and the metrics that drive operational confidence."
        }
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Results" }]}
        actions={stickyActions}
      />

      {/* Range Summary - Only show for multi-day queries */}
      {isRangeQuery && rangeSummary && (
        <Card className="rounded-3xl border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Range Summary</CardTitle>
            <CardDescription>Aggregated statistics across the entire {rangeSummary.dayCount}-day forecast period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Temperature</p>
                <p className="text-2xl font-semibold">{formatTemperature(rangeSummary.avgTemp, temperatureUnit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Min Temperature</p>
                <p className="text-2xl font-semibold text-blue-600">{formatTemperature(rangeSummary.minTemp, temperatureUnit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max Temperature</p>
                <p className="text-2xl font-semibold text-red-600">{formatTemperature(rangeSummary.maxTemp, temperatureUnit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Precipitation</p>
                <p className="text-2xl font-semibold">{formatPrecip(rangeSummary.totalPrecip, precipUnit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Wind Speed</p>
                <p className="text-2xl font-semibold">{Math.round(rangeSummary.avgWind)} km/h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Navigation - Only show for multi-day queries */}
      {isRangeQuery && (
        <Card className="rounded-3xl border border-border/60 bg-background/70">
          <CardHeader>
            <CardTitle>Select Day</CardTitle>
            <CardDescription>Click a day to view detailed metrics below</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.metrics.map((metric, index) => (
                <Button
                  key={metric.date}
                  variant={selectedDayIndex === index ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setSelectedDayIndex(index)}
                >
                  {formatDate(metric.date)}
                </Button>
              ))}
            </div>
            {result.metrics[selectedDayIndex] ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Showing details for <span className="font-semibold text-foreground">{formatDate(selectedMetric.date)}</span>
              </p>
            ) : (
              <p className="mt-4 text-sm text-destructive">No data for this day</p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="probabilities">
            Probabilities
            {!canAccessFeature("probabilistic") && <Lock className="ml-1 h-3 w-3" />}
          </TabsTrigger>
          <TabsTrigger value="extreme">
            Extreme events
            {!canAccessFeature("extremeEvents") && <Lock className="ml-1 h-3 w-3" />}
          </TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartPanel
              title="Temperature profile"
              description={`Daily ${temperatureUnit === "c" ? "°C" : "°F"} averages with min/max envelope.`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={temperatureSeries}>
                  <defs>
                    <linearGradient id="temp-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                  <XAxis dataKey="date" tickFormatter={(value) => formatDate(value)} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<TemperatureTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="maxTemp" stroke="hsl(var(--primary))" strokeWidth={1} fill="transparent" name="Max" />
                  <Area type="monotone" dataKey="avgTemp" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#temp-gradient)" name="Avg" />
                  <Area type="monotone" dataKey="minTemp" stroke="hsl(var(--secondary))" strokeWidth={1} fill="transparent" name="Min" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Precipitation outlook"
              description={`Daily precipitation totals (${precipUnit}) with probability of occurrence.`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={precipSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                  <XAxis dataKey="date" tickFormatter={(value) => formatDate(value)} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip content={<PrecipTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="precipAmount" fill="hsl(var(--accent))" name={`Precip (${precipUnit})`} radius={[8, 8, 8, 8]} />
                  <Bar yAxisId="right" dataKey="precipProb" fill="hsl(var(--primary))" name="Probability" opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          {/* Per-Day Metrics - Show selected day details for range queries, or single day for single-day queries */}
          {selectedMetric && (
            <Card className="rounded-3xl border border-border/60 bg-background/70">
              <CardHeader>
                <CardTitle>
                  {isRangeQuery ? `Day Details: ${formatDate(selectedMetric.date)}` : "Day Details"}
                </CardTitle>
                <CardDescription>
                  {isRangeQuery 
                    ? "Detailed metrics for the selected day" 
                    : `Single-day forecast for ${formatDate(selectedMetric.date)}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Avg Temp</p>
                    <p className="text-3xl font-bold">{formatTemperature(selectedMetric.avgTemp, temperatureUnit)}</p>
                    <p className="text-xs text-muted-foreground">
                      Min: {formatTemperature(selectedMetric.minTemp, temperatureUnit)} / Max: {formatTemperature(selectedMetric.maxTemp, temperatureUnit)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Precipitation</p>
                    <p className="text-3xl font-bold">{formatPrecip(selectedMetric.precipMm, precipUnit)}</p>
                    <p className="text-xs text-muted-foreground">
                      Probability: {formatPercent(selectedMetric.precipProb, 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Wind Speed</p>
                    <p className="text-3xl font-bold">{Math.round(selectedMetric.windSpeed)} km/h</p>
                    <p className="text-xs text-muted-foreground">Humidity: {Math.round(selectedMetric.humidity)}%</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Other</p>
                    <p className="text-lg font-semibold">UV: {selectedMetric.uv.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Pressure: {Math.round(selectedMetric.pressure)} hPa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-3xl border border-border/60 bg-background/70">
              <CardHeader>
                <CardTitle>Weekly narratives</CardTitle>
                <CardDescription>Condensed insights every seven days with operational risk levels.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.weeklySummaries.map((week) => (
                    <WeeklyCard
                      key={week.weekOf}
                      weekLabel={formatDate(week.weekOf)}
                      narrative={week.narrative}
                      riskLevel={week.riskLevel}
                      meta={`Confidence: ${week.riskLevel === "high" ? "72%" : week.riskLevel === "medium" ? "64%" : "58%"}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border/60 bg-background/70">
              <CardHeader>
                <CardTitle>Spatial context</CardTitle>
                <CardDescription>Heatmap overlay illustrates risk concentration for the selected location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative overflow-hidden rounded-3xl">
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/40 via-transparent" aria-hidden />
                  <GeoMap position={searchMeta?.coordinates ?? undefined} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Location centroids and ensemble spread highlight where operational risk intensifies for upcoming days.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="probabilities" className="space-y-4">
          <TierGate
            allowed={canAccessFeature("probabilistic")}
            requiredTier="standard"
            reason="Probability distributions unlock from Standard tier onwards."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {result.probabilities.map((probability) => (
                <ProbabilityBar
                  key={probability.date}
                  label={formatDate(probability.date)}
                  probability={probability.probability}
                  lower={probability.lower}
                  upper={probability.upper}
                />
              ))}
            </div>
          </TierGate>
        </TabsContent>

        <TabsContent value="extreme" className="space-y-4">
          <TierGate
            allowed={canAccessFeature("extremeEvents")}
            requiredTier="professional"
            reason="Extreme event scouting is included with Professional and Enterprise tiers."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {result.extremeEvents.length === 0 ? (
                <EmptyState
                  title="No extreme event flags"
                  description="This horizon currently shows no high-risk events. Continue monitoring for updates."
                  className="md:col-span-2"
                />
              ) : (
                result.extremeEvents.map((event) => (
                  <Card key={event.id} className="rounded-3xl border border-border/60 bg-background/70 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground">{event.type}</h3>
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{event.narrative}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Probability</span>
                      <span className="font-semibold text-primary">{formatPercent(event.probability, 0)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Onset window</span>
                      <span>{formatDate(event.onsetWindow.start)} → {formatDate(event.onsetWindow.end)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Expected duration</span>
                      <span>{event.durationHours} hours</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TierGate>
        </TabsContent>

        <TabsContent value="table">
          {!canAccessFeature("exports") && (
            <div className="mb-4 flex items-center gap-2 rounded-3xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
              <span>Exports are locked on your current plan.</span>
              <Link href="/pricing" className="text-primary hover:underline ml-1">
                Upgrade to download CSV, PDF, or Excel packets.
              </Link>
            </div>
          )}
          <ScrollArea className="h-[420px] rounded-3xl border border-border/60 bg-background/70 p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Avg temp</TableHead>
                  <TableHead>Min temp</TableHead>
                  <TableHead>Max temp</TableHead>
                  <TableHead>Precip</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Wind (km/h)</TableHead>
                  <TableHead>Humidity</TableHead>
                  <TableHead>UV</TableHead>
                  <TableHead>Pressure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.metrics.map((metric) => (
                  <TableRow key={metric.date}>
                    <TableCell className="font-medium">{formatDate(metric.date)}</TableCell>
                    <TableCell>{formatTemperature(metric.avgTemp, temperatureUnit)}</TableCell>
                    <TableCell>{formatTemperature(metric.minTemp, temperatureUnit)}</TableCell>
                    <TableCell>{formatTemperature(metric.maxTemp, temperatureUnit)}</TableCell>
                    <TableCell>{formatPrecip(metric.precipMm, precipUnit)}</TableCell>
                    <TableCell>{formatPercent(metric.precipProb, 0)}</TableCell>
                    <TableCell>{Math.round(metric.windSpeed)}</TableCell>
                    <TableCell>{Math.round(metric.humidity)}%</TableCell>
                    <TableCell>{metric.uv.toFixed(1)}</TableCell>
                    <TableCell>{Math.round(metric.pressure)} hPa</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Tier upgrade prompt */}
      {tier !== "professional" && tier !== "enterprise" && (
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Unlock Full Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier === "basic" 
                    ? "Upgrade to Standard for probabilistic insights, or Professional for exports and alerts."
                    : "Upgrade to Professional for extreme event scouting, exports, and email alerts."
                  }
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

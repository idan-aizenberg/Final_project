"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import { AlertTriangle, Download, Save, Send, Share2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const { tier } = useTier();
  const tierDefinition = tiers[tier];

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
          <TierGate
            allowed={tierDefinition.gating.alerts.length > 0}
            requiredTier="professional"
            reason="Automated alerts unlock with Professional tiers."
            className="rounded-full border-none"
          >
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => toast({ title: "Alert scheduled" })}
            >
              <Send className="mr-1 h-4 w-4" aria-hidden /> Set alert
            </Button>
          </TierGate>
          <TierGate
            allowed={tierDefinition.gating.exports.includes("csv")}
            requiredTier="professional"
            reason="Downloads are limited to Professional and Enterprise plans."
            className="rounded-full border-none"
          >
            <Button size="sm" className="rounded-full" onClick={() => toast({ title: "Preparing export" })}>
              <Download className="mr-1 h-4 w-4" aria-hidden /> Download
            </Button>
          </TierGate>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title={searchMeta?.location ?? "Forecast results"}
        description="Explore probabilistic uncertainty, upcoming extreme events, and the metrics that drive operational confidence."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Results" }]}
        actions={stickyActions}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="probabilities">Probabilities</TabsTrigger>
          <TabsTrigger value="extreme">Extreme events</TabsTrigger>
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
            allowed={tierDefinition.gating.probabilistic}
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
            allowed={tierDefinition.gating.extremeEvents}
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
          {tierDefinition.gating.exports.length === 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-3xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
              Exports are locked on your current plan. Upgrade to download CSV, PDF, or Excel packets.
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
    </div>
  );
}

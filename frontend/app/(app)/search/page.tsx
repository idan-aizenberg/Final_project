"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { differenceInDays, addDays, formatISO } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { SearchFilters } from "@/components/shared/SearchFilters";
import { TierGate } from "@/components/shared/TierGate";
import { toast } from "@/components/ui/use-toast";
import { runForecastQuery } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { tiers } from "@/lib/tiers";
import type { SearchFormValues } from "@/types/search";
import { useTier } from "@/hooks/useTier";

const searchSchema = z
  .object({
    location: z.string().min(2, "Location is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    range: z.object({
      start: z.string(),
      end: z.string(),
    }),
    resolution: z.enum(["daily", "weekly", "monthly"]),
    forecastType: z.enum(["standard", "probabilistic", "extreme"]),
    output: z.enum(["table", "charts", "download"]),
    preset: z.string().nullable().optional(),
    units: z.object({
      temperature: z.enum(["c", "f"]),
      precipitation: z.enum(["mm", "in"]),
    }),
    autoAlert: z.boolean().optional(),
  })
  .refine((data) => new Date(data.range.end) >= new Date(data.range.start), {
    message: "End date must be after start date",
    path: ["range", "end"],
  })
  .refine((data) => {
    const diff = differenceInDays(new Date(data.range.end), new Date(data.range.start));
    return diff >= 7 && diff <= 365;
  }, {
    message: "Select a range between 7 and 365 days",
    path: ["range", "end"],
  });

const presets = ["Frost risk", "Heatwave watch", "Storm surge", "Pollen comfort"];

function calculateQueryCost(values: SearchFormValues) {
  const days = Math.max(1, differenceInDays(new Date(values.range.end), new Date(values.range.start)));
  let cost = Math.ceil(days / 7);
  if (values.resolution === "daily") cost += 1;
  if (values.forecastType === "probabilistic") cost += 2;
  if (values.forecastType === "extreme") cost += 3;
  if (values.output === "download") cost += 2;
  if (values.preset) cost += 1;
  return Math.max(cost, 1);
}

export default function SearchPage() {
  const router = useRouter();
  const { tier, queriesUsedToday, setQueriesUsedToday } = useTier();
  const tierDefinition = tiers[tier];

  const defaultStart = new Date();
  const defaultEnd = addDays(defaultStart, Math.min(14, tierDefinition.horizonDays));

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      location: "Tel Aviv, Israel",
      range: {
        start: formatISO(defaultStart, { representation: "date" }),
        end: formatISO(defaultEnd, { representation: "date" }),
      },
      resolution: "daily",
      forecastType: tierDefinition.gating.probabilistic ? "probabilistic" : "standard",
      output: "charts",
      preset: null,
      units: {
        temperature: "c",
        precipitation: "mm",
      },
      autoAlert: tierDefinition.gating.alerts.length > 0,
    },
  });

  const watchValues = form.watch();

  const queryCost = useMemo(() => calculateQueryCost(watchValues), [watchValues]);
  const queryLimit = tierDefinition.queriesPerDay;

  const availability = useMemo(
    () => ({
      forecast: {
        standard: true,
        probabilistic: tierDefinition.gating.probabilistic,
        extreme: tierDefinition.gating.extremeEvents,
      },
      outputs: {
        table: true,
        charts: true,
        download: tierDefinition.gating.exports.length > 0,
      },
    }),
    [tierDefinition]
  );

  const mutation = useMutation({
    mutationFn: runForecastQuery,
    onError: () => {
      toast({
        title: "Unable to run forecast",
        description: "Please adjust your selections and try again.",
      });
    },
  });



  const handleSubmit = async (values: SearchFormValues) => {
    if (!availability.forecast?.[values.forecastType]) {
      form.setValue("forecastType", "standard");
      return;
    }

    const payload = {
      location: values.location,
      coordinates:
        values.latitude && values.longitude ? ([values.latitude, values.longitude] as [number, number]) : undefined,
      startDate: values.range.start,
      endDate: values.range.end,
      resolution: values.resolution,
      forecastType: values.forecastType,
      output: values.output,
      preset: values.preset ?? undefined,
      cost: queryCost,
    };

    try {
      const result = await mutation.mutateAsync(payload);
      toast({
        title: "Forecast ready",
        description: formatDateRange(
          new Date(result.metrics[0].date),
          new Date(result.metrics.at(-1)?.date ?? result.metrics[0].date)
        ),
      });
      setQueriesUsedToday(queriesUsedToday + queryCost);
      router.push(`/results?id=${result.id}&temp=${values.units.temperature}&precip=${values.units.precipitation}`);
    } catch (error) {
      // handled by mutation onError
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Forecast search"
        description="Configure a location, horizon, and output format to generate WeatherSight intelligence."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Search" }]}
      />

      <Card className="rounded-3xl border border-border/60 bg-background/70">
        <CardContent className="grid gap-6 p-6">
          {!tierDefinition.gating.probabilistic && (
            <TierGate
              allowed={tierDefinition.gating.probabilistic}
              requiredTier="standard"
              reason="Probabilistic forecasts unlock on the Standard tier."
              className="mb-4"
            >
              <div className="hidden" />
            </TierGate>
          )}
          <SearchFilters
            form={form}
            presets={presets}
            onSubmit={handleSubmit}
            queryCost={queryCost}
            queryLimit={queryLimit}
            isSubmitting={mutation.isPending}
            availability={availability}
            alertsEnabled={tierDefinition.gating.alerts.length > 0}
          />
          {tierDefinition.gating.exports.length === 0 && (
            <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
              Downloads are available from the Professional tier. Charts and tables remain interactive in-app.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchFilters } from "@/components/shared/SearchFilters";
import type { SearchFormValues } from "@/types/search";
import { useTier } from "@/hooks/useTier";
import { toast } from "@/components/ui/use-toast";
import { saveSearchResult } from "@/lib/resultsStorageService";

export default function AdvancedSearchPage() {
  const router = useRouter();
  const { maxHorizonDays, queriesUsedToday, tierDefinition, canPerformQuery, incrementQueryUsage } = useTier();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<SearchFormValues>({
    defaultValues: {
      location: "",
      latitude: undefined,
      longitude: undefined,
      range: {
        start: "",
        end: "",
      },
      resolution: "daily",
      forecastType: "standard",
      output: "charts",
      preset: null,
      units: {
        temperature: "c",
        precipitation: "mm",
      },
      autoAlert: false,
    },
  });

  const handleSubmit = async (values: SearchFormValues) => {
    if (!canPerformQuery()) {
      toast({
        title: "Query limit reached",
        description: `You've used all ${tierDefinition.queriesPerDay} queries today. Upgrade for more.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call to create forecast query
      // In a real implementation, this would call your backend API
      const response = await fetch("/api/weather/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create forecast");
      }

      const result = await response.json();

      // Increment query usage
      incrementQueryUsage();

      // Auto-save search result
      try {
        saveSearchResult({
          searchType: 'advanced',
          query: values,
          summary: {
            location: values.location || 'Custom Location',
            dateRange: {
              start: values.range.start,
              end: values.range.end,
            },
          },
          resultData: result,
        });
      } catch (saveError) {
        console.error('Failed to save search result:', saveError);
      }

      // Navigate to results page with the result ID
      const params = new URLSearchParams({
        id: result.id,
        temp: values.units.temperature,
        precip: values.units.precipitation,
      });

      toast({
        title: "Forecast generated",
        description: `Processing ${values.range.start} to ${values.range.end}`,
      });

      router.push(`/results?${params.toString()}`);
    } catch (error: any) {
      toast({
        title: "Forecast failed",
        description: error.message || "An error occurred while generating the forecast",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate query cost (simplified example)
  const queryCost = 1; // In a real app, this would be calculated based on range, resolution, etc.

  return (
    <div className="space-y-8">
      <PageHeader
        title="Advanced Weather Search"
        description="Search for weather forecasts with date ranges, custom parameters, and multiple output formats"
        breadcrumbs={[{ label: "Search", href: "/search" }, { label: "Advanced" }]}
      />

      <div className="container mx-auto max-w-4xl">
        <SearchFilters
          form={form}
          presets={["Heatwave watch", "Frost risk", "Outdoor event", "Agriculture"]}
          onSubmit={handleSubmit}
          queryCost={queryCost}
          queryLimit={tierDefinition.queriesPerDay}
          isSubmitting={isSubmitting}
          maxHorizonDays={maxHorizonDays}
          availability={{
            forecast: {
              standard: true,
              probabilistic: tierDefinition.gating.probabilisticBasic,
              extreme: tierDefinition.gating.extremeEventsModerate,
            },
            outputs: {
              table: true,
              charts: true,
              download: tierDefinition.gating.exports.length > 0,
            },
          }}
          alertsEnabled={tierDefinition.gating.alerts.length > 0}
        />

        {/* Info Card */}
        <div className="mt-6 rounded-3xl border border-border/60 bg-muted/30 p-6">
          <h3 className="font-semibold mb-3">Date Range Support</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Select a <strong>start date</strong> and <strong>end date</strong> to query multiple days at once</li>
            <li>• Your {tierDefinition.name} plan supports forecasts up to <strong>{maxHorizonDays} days</strong> ahead</li>
            <li>• Single-day queries: Set start date = end date</li>
            <li>• Multi-day queries: Results page will show day navigation and range summary</li>
            <li>• One query counts as ONE credit, regardless of how many days in the range</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

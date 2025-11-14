"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, FolderPlus, MapPinned } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { fetchRecentSearches, fetchUsage } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { tiers } from "@/lib/tiers";
import { useTier } from "@/hooks/useTier";

export default function DashboardPage() {
  const router = useRouter();
  const { tier, setQueriesUsedToday } = useTier();

  const recentSearches = useQuery({ queryKey: ["recent-searches"], queryFn: fetchRecentSearches });
  const usage = useQuery({ queryKey: ["usage"], queryFn: fetchUsage });

  useEffect(() => {
    if (usage.data) {
      setQueriesUsedToday(usage.data.usedToday);
    }
  }, [usage.data, setQueriesUsedToday]);

  const tierDefinition = tiers[tier];
  const remaining = tierDefinition.queriesPerDay === "unlimited" ? Infinity : tierDefinition.queriesPerDay - (usage.data?.usedToday ?? 0);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        description="Track recent forecast runs, monitor usage, and jump back into your saved locations."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
        actions={
          <Button className="rounded-full" asChild>
            <Link href="/search" className="flex items-center gap-2">
              New search
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Tier"
          primaryValue={tierDefinition.name}
          deltaLabel="Horizon"
          deltaValue={`${tierDefinition.horizonDays}-day outlook`}
          trend="steady"
          footer="Upgrade for deeper horizons, real-time alerts, and additional exports."
          icon={<FolderPlus className="h-5 w-5 text-primary" aria-hidden />}
        />
        <MetricCard
          label="Queries remaining"
          primaryValue={tierDefinition.queriesPerDay === "unlimited" ? "Unlimited" : `${Math.max(remaining, 0)}`}
          deltaLabel="Used today"
          deltaValue={`${usage.data?.usedToday ?? 0}`}
          trend={remaining > 5 || tierDefinition.queriesPerDay === "unlimited" ? "steady" : "down"}
          footer="Resets at local midnight."
          icon={<Clock3 className="h-5 w-5 text-amber-500" aria-hidden />}
        />
        <MetricCard
          label="Automation"
          primaryValue={tierDefinition.gating.alerts.length > 0 ? "Alerts enabled" : "Alerts locked"}
          deltaLabel={tierDefinition.gating.alerts.length > 0 ? "Channels" : "Available in"}
          deltaValue={tierDefinition.gating.alerts.length > 0 ? tierDefinition.gating.alerts.join(", ") : "Professional"}
          trend={tierDefinition.gating.alerts.length > 0 ? "up" : "steady"}
          footer="Configure alert thresholds straight from results."
          icon={<MapPinned className="h-5 w-5 text-emerald-500" aria-hidden />}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent searches</h2>
            <p className="text-sm text-muted-foreground">Your last six forecast runs for quick replays and comparisons.</p>
          </div>
          <Button variant="ghost" className="rounded-full" onClick={() => recentSearches.refetch()}>
            Refresh
          </Button>
        </div>

        {recentSearches.isLoading ? (
          <Card className="rounded-3xl border border-border/60 bg-background/70 p-6">
            <CardContent className="animate-pulse text-sm text-muted-foreground">Loading recent searches…</CardContent>
          </Card>
        ) : recentSearches.data && recentSearches.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recentSearches.data.map((search) => (
              <Card key={search.id} className="rounded-3xl border border-border/60 bg-background/70 p-6">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{search.location}</CardTitle>
                    <CardDescription>{formatDateRange(new Date(search.startDate), new Date(search.endDate))}</CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => router.push(`/results?id=${search.id}`)}>
                    View
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Resolution</span>
                    <span className="font-medium text-foreground">{search.resolution}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Forecast</span>
                    <span className="font-medium text-foreground capitalize">{search.forecastType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Output</span>
                    <span className="font-medium text-foreground capitalize">{search.output}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No searches yet"
            description="Start by running a forecast query. Saved searches will appear here for quick access."
            action={{ label: "Run first forecast", href: "/search" }}
            className="rounded-3xl"
          />
        )}
      </section>
    </div>
  );
}

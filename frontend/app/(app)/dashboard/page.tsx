"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, FolderPlus, MapPinned, Crown, Zap, Shield, Bookmark, Star } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { SearchTypeDialog } from "@/components/shared/SearchTypeDialog";
import { fetchRecentSearches, fetchSavedSearches } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { useTier } from "@/hooks/useTier";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TierId } from "@/lib/tiers";

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { 
    tier, 
    tierDefinition, 
    queriesUsedToday, 
    queriesRemaining,
    canAccessFeature 
  } = useTier();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const recentSearches = useQuery({ queryKey: ["recent-searches"], queryFn: fetchRecentSearches });
  const savedSearchesQuery = useQuery({ queryKey: ["saved-searches"], queryFn: fetchSavedSearches });

  const savedSearches = savedSearchesQuery.data?.searches || [];
  const savedSearchLimit = tierDefinition.gating.maxLocations;
  const savedSearchLimitDisplay = savedSearchLimit === "unlimited" ? "∞" : savedSearchLimit;

  const getTierIcon = (tierId: TierId) => {
    switch (tierId) {
      case 'professional':
        return <Crown className="h-5 w-5 text-purple-500" />;
      case 'enterprise':
        return <Shield className="h-5 w-5 text-amber-500" />;
      case 'standard':
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return <FolderPlus className="h-5 w-5 text-primary" />;
    }
  };

  const getTierColor = (tierId: TierId) => {
    switch (tierId) {
      case 'professional':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'enterprise':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'standard':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      default:
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  // Calculate remaining queries display
  const remainingDisplay = queriesRemaining === "unlimited" 
    ? "Unlimited" 
    : `${queriesRemaining}`;
  
  const limitDisplay = tierDefinition.queriesPerDay === "unlimited"
    ? "∞"
    : tierDefinition.queriesPerDay;

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Welcome back${userProfile?.full_name ? `, ${userProfile.full_name}` : ''}!`}
        description="Track recent forecast runs, monitor usage, and jump back into your saved locations."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn("text-sm", getTierColor(tier))}>
              {getTierIcon(tier)}
              <span className="ml-1.5">{tierDefinition.name}</span>
            </Badge>
            <Button className="rounded-full" onClick={() => setSearchDialogOpen(true)}>
              New search
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden />
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Subscription Tier"
          primaryValue={tierDefinition.name}
          deltaLabel="Horizon"
          deltaValue={`${tierDefinition.horizonDays}-day outlook`}
          trend="steady"
          footer={tier === 'basic' ? "Upgrade for deeper horizons and real-time alerts." : "Enjoying premium features!"}
          icon={getTierIcon(tier)}
        />
        <MetricCard
          label="Queries remaining"
          primaryValue={remainingDisplay}
          deltaLabel="Used today"
          deltaValue={`${queriesUsedToday} / ${limitDisplay}`}
          trend={
            queriesRemaining === "unlimited" 
              ? "steady" 
              : (queriesRemaining as number) > 5 
                ? "steady" 
                : "down"
          }
          footer="Resets at local midnight."
          icon={<Clock3 className="h-5 w-5 text-amber-500" aria-hidden />}
        />
        <MetricCard
          label="Saved searches"
          primaryValue={`${savedSearches.length}`}
          deltaLabel="Limit"
          deltaValue={`${savedSearches.length} / ${savedSearchLimitDisplay}`}
          trend={
            savedSearchLimit === "unlimited" 
              ? "steady" 
              : savedSearches.length >= (savedSearchLimit as number) 
                ? "down" 
                : "steady"
          }
          footer="Quick access to your frequent locations."
          icon={<Bookmark className="h-5 w-5 text-indigo-500" aria-hidden />}
        />
        <MetricCard
          label="Automation"
          primaryValue={canAccessFeature("alerts") ? "Alerts enabled" : "Alerts locked"}
          deltaLabel={canAccessFeature("alerts") ? "Channels" : "Available in"}
          deltaValue={canAccessFeature("alerts") ? tierDefinition.gating.alerts.join(", ") : "Professional"}
          trend={canAccessFeature("alerts") ? "up" : "steady"}
          footer="Configure alert thresholds straight from results."
          icon={<MapPinned className="h-5 w-5 text-emerald-500" aria-hidden />}
        />
      </section>

      {/* Saved Searches Section */}
      {savedSearches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Saved searches</h2>
              <p className="text-sm text-muted-foreground">Quick access to your favorite locations and search configurations.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="rounded-full" onClick={() => savedSearchesQuery.refetch()}>
                Refresh
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/search">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Manage
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {savedSearches.slice(0, 8).map((search) => (
              <Card key={search.id} className="group rounded-2xl border border-border/60 bg-background/70 p-4 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => router.push(`/search`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {search.isFavorite && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                      <h3 className="font-medium text-sm truncate">{search.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{search.location}</p>
                    {search.dayOfYear && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Day {search.dayOfYear}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {search.forecastType}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {savedSearches.length > 8 && (
            <div className="text-center">
              <Button variant="link" asChild className="text-xs">
                <Link href="/search">View all {savedSearches.length} saved searches</Link>
              </Button>
            </div>
          )}
        </section>
      )}

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

      {/* Tier-specific promotional content */}
      {tier === 'basic' && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-blue-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Unlock More with Standard
                </CardTitle>
                <CardDescription className="mt-2">
                  Get 50 queries per day, 30-day forecasts, and probabilistic insights
                </CardDescription>
              </div>
              <Button variant="default" className="rounded-full" asChild>
                <Link href="/pricing">Upgrade</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {tier === 'standard' && (
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  Go Professional for Advanced Features
                </CardTitle>
                <CardDescription className="mt-2">
                  Unlock 200 queries/day, 180-day forecasts, exports, and email alerts
                </CardDescription>
              </div>
              <Button variant="default" className="rounded-full" asChild>
                <Link href="/pricing">Upgrade</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Search Type Dialog */}
      <SearchTypeDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
    </div>
  );
}

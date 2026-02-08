"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { 
  Bookmark, 
  MapPin, 
  Calendar, 
  Star, 
  Trash2, 
  Play,
  MoreVertical,
  Search,
  Lock,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { 
  fetchSavedSearches, 
  deleteSavedSearch, 
  updateSavedSearch,
  markSearchAsUsed,
  type SavedSearch 
} from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function SavedSearchesPage() {
  const router = useRouter();
  const { tier, tierDefinition } = useTier();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const limit = tierDefinition.gating.maxLocations;
  const limitDisplay = limit === "unlimited" ? "∞" : limit;

  const loadSavedSearches = useCallback(async () => {
    try {
      const { searches } = await fetchSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error("Failed to load saved searches:", error);
      toast({
        title: "Error",
        description: "Failed to load saved searches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  const getDayOfYearDate = (dayOfYear: number): string => {
    const date = new Date(2025, 0, dayOfYear);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatLastUsed = (dateStr?: string): string => {
    if (!dateStr) return "Never used";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleToggleFavorite = async (search: SavedSearch) => {
    setActionLoading(search.id);
    try {
      await updateSavedSearch(search.id, { isFavorite: !search.isFavorite });
      await loadSavedSearches();
      toast({
        title: search.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `"${search.name}" has been updated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (search: SavedSearch) => {
    setActionLoading(search.id);
    try {
      await deleteSavedSearch(search.id);
      await loadSavedSearches();
      toast({
        title: "Search deleted",
        description: `"${search.name}" has been removed`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete search",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunSearch = async (search: SavedSearch) => {
    await markSearchAsUsed(search.id);
    // Navigate to search page with the saved search parameters as query params
    // The fromSaved flag tells the search page not to save this as a new result
    const params = new URLSearchParams({
      location: search.location,
      lat: search.lat.toString(),
      lon: search.lon.toString(),
      day: search.dayOfYear?.toString() || "",
      fromSaved: "true",
    });
    router.push(`/search?${params.toString()}`);
  };

  const canSaveMore = limit === "unlimited" || savedSearches.length < limit;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Saved Searches"
        description="Manage your saved search configurations for quick access"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Saved Searches" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {savedSearches.length} / {limitDisplay}
            </Badge>
            <Button asChild className="rounded-full">
              <Link href="/search">
                <Search className="h-4 w-4 mr-2" />
                New Search
              </Link>
            </Button>
          </div>
        }
      />

      {/* Tier limit info */}
      {!canSaveMore && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-600">Saved search limit reached</p>
                  <p className="text-sm text-muted-foreground">
                    Your {tierDefinition.name} plan allows {limit} saved searches.
                  </p>
                </div>
              </div>
              <Button asChild variant="default" size="sm" className="rounded-full">
                <Link href="/pricing">
                  <Zap className="h-4 w-4 mr-1" />
                  Upgrade
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="rounded-3xl">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading saved searches...</p>
          </CardContent>
        </Card>
      ) : savedSearches.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          description="Save your first search to quickly access your favorite locations and configurations."
          action={{ label: "Go to Search", href: "/search" }}
          className="rounded-3xl"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedSearches.map((search) => (
            <Card
              key={search.id}
              className={cn(
                "group rounded-2xl border border-border/60 transition-all hover:border-primary/40 hover:shadow-md",
                actionLoading === search.id && "opacity-50 pointer-events-none"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {search.isFavorite && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">{search.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunSearch(search)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run search
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleFavorite(search)}>
                        <Star className={cn("h-4 w-4 mr-2", search.isFavorite && "fill-current")} />
                        {search.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(search)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{search.location}</span>
                </div>
                {search.dayOfYear && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Day {search.dayOfYear} ({getDayOfYearDate(search.dayOfYear)})</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {search.resolution}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {search.forecastType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">
                    {formatLastUsed(search.lastUsedAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full"
                    onClick={() => handleRunSearch(search)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tip card */}
      {savedSearches.length > 0 && canSaveMore && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> You can save searches directly from the search results page. Star your favorites for quick access!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bookmark,
  ChevronDown,
  MapPin,
  Calendar,
  Star,
  Trash2,
  Play,
  MoreVertical,
  Zap,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { type SavedSearch, deleteSavedSearch, updateSavedSearch } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

interface SavedSearchesListProps {
  searches: SavedSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  onRefresh: () => void;
  variant?: "dropdown" | "panel";
}

export function SavedSearchesList({
  searches,
  onLoadSearch,
  onRefresh,
  variant = "dropdown",
}: SavedSearchesListProps) {
  const { tierDefinition } = useTier();
  const [loading, setLoading] = useState<string | null>(null);

  const limit = tierDefinition.gating.maxLocations;
  const remaining = limit === "unlimited" ? "unlimited" : Math.max(0, (limit as number) - searches.length);

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

  const handleToggleFavorite = async (search: SavedSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(search.id);
    try {
      await updateSavedSearch(search.id, { isFavorite: !search.isFavorite });
      onRefresh();
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
      setLoading(null);
    }
  };

  const handleDelete = async (search: SavedSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(search.id);
    try {
      await deleteSavedSearch(search.id);
      onRefresh();
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
      setLoading(null);
    }
  };

  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search);
    toast({
      title: "Search loaded",
      description: `"${search.name}" has been loaded into the form`,
    });
  };

  // Empty state
  if (searches.length === 0) {
    return (
      <div className={cn(
        "text-center",
        variant === "panel" ? "py-8" : "p-4"
      )}>
        <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="font-medium text-sm">No saved searches yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Save your first search to quickly access it later
        </p>
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Saved ({searches.length})
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Saved Searches</span>
            <span>{searches.length} / {limit === "unlimited" ? "∞" : limit}</span>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-[300px]">
            {searches.map((search) => (
              <DropdownMenuItem
                key={search.id}
                className="flex items-start gap-3 p-3 cursor-pointer"
                onSelect={() => handleLoadSearch(search)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {search.isFavorite && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    )}
                    <span className="font-medium text-sm truncate">{search.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{search.location}</span>
                  </div>
                  {search.dayOfYear && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Day {search.dayOfYear}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {search.forecastType}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatLastUsed(search.lastUsedAt)}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
          {remaining !== "unlimited" && remaining <= 2 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button asChild size="sm" variant="ghost" className="w-full justify-start text-xs">
                  <Link href="/pricing">
                    <Zap className="h-3 w-3 mr-2" />
                    Upgrade for more saved searches
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Panel variant
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Saved Searches</h3>
        <Badge variant="outline" className="text-xs">
          {searches.length} / {limit === "unlimited" ? "∞" : limit}
        </Badge>
      </div>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2 pr-2">
          {searches.map((search) => (
            <div
              key={search.id}
              className={cn(
                "group relative rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/30",
                loading === search.id && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => handleLoadSearch(search)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    {search.isFavorite && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{search.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{search.location}</span>
                  </div>
                  {search.dayOfYear && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>Day {search.dayOfYear} ({getDayOfYearDate(search.dayOfYear)})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {search.resolution}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {search.forecastType}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatLastUsed(search.lastUsedAt)}
                    </span>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleLoadSearch(search)}>
                      <Play className="h-4 w-4 mr-2" />
                      Load search
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleToggleFavorite(search, e)}>
                      <Star className={cn("h-4 w-4 mr-2", search.isFavorite && "fill-current")} />
                      {search.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDelete(search, e)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {remaining !== "unlimited" && remaining <= 2 && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              {remaining === 0 ? "Limit reached" : `${remaining} slot${remaining === 1 ? "" : "s"} remaining`}
            </span>
            <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs">
              <Link href="/pricing">Upgrade</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


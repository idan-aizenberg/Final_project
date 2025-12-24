"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Lock, Zap, MapPin, Calendar } from "lucide-react";
import { useTier } from "@/hooks/useTier";
import { createSavedSearch } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchData: {
    location: string;
    lat: number;
    lon: number;
    displayName?: string;
    dayOfYear?: number;
    resolution?: "daily" | "weekly" | "monthly";
    forecastType?: "standard" | "probabilistic" | "extreme";
  };
  currentSavedCount: number;
  onSaveSuccess?: () => void;
}

export function SaveSearchDialog({
  open,
  onOpenChange,
  searchData,
  currentSavedCount,
  onSaveSuccess,
}: SaveSearchDialogProps) {
  const { tier, tierDefinition } = useTier();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = tierDefinition.gating.maxLocations;
  const isAtLimit = limit !== "unlimited" && currentSavedCount >= limit;
  const remaining = limit === "unlimited" ? "unlimited" : limit - currentSavedCount;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this saved search",
        variant: "destructive",
      });
      return;
    }

    if (isAtLimit) {
      toast({
        title: "Limit reached",
        description: `You've reached your saved search limit (${limit})`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createSavedSearch({
        name: name.trim(),
        location: searchData.location,
        lat: searchData.lat,
        lon: searchData.lon,
        displayName: searchData.displayName,
        dayOfYear: searchData.dayOfYear,
        resolution: searchData.resolution || "daily",
        forecastType: searchData.forecastType || "standard",
      });

      toast({
        title: "Search saved!",
        description: `"${name.trim()}" has been saved to your searches`,
      });

      setName("");
      onOpenChange(false);
      onSaveSuccess?.();
    } catch (error) {
      console.error("Error saving search:", error);
      toast({
        title: "Failed to save",
        description: "An error occurred while saving your search",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getDayOfYearDate = (dayOfYear: number): string => {
    const date = new Date(2025, 0, dayOfYear);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Save Search
          </DialogTitle>
          <DialogDescription>
            Save this search configuration for quick access later.
          </DialogDescription>
        </DialogHeader>

        {isAtLimit ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-600">Limit Reached</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You've used all {limit} saved search slots on your {tierDefinition.name} plan.
              </p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Need more saved searches?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upgrade to save more searches
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/pricing">
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Upgrade
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Search preview */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{searchData.location}</span>
              </div>
              {searchData.dayOfYear && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Day {searchData.dayOfYear} ({getDayOfYearDate(searchData.dayOfYear)})</span>
                </div>
              )}
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {searchData.resolution || "daily"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {searchData.forecastType || "standard"}
                </Badge>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="search-name">Search name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Tel Aviv Summer Check"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>

            {/* Usage indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Saved searches</span>
              <span className={cn(
                "font-medium",
                remaining !== "unlimited" && remaining <= 1 && "text-amber-600"
              )}>
                {currentSavedCount} / {limit === "unlimited" ? "∞" : limit}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isAtLimit && (
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Search"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


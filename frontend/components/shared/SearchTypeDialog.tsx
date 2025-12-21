"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Filter, ArrowRight } from "lucide-react";

interface SearchTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchTypeDialog({ open, onOpenChange }: SearchTypeDialogProps) {
  const router = useRouter();

  const handleLocationSearch = () => {
    onOpenChange(false);
    router.push("/search");
  };

  const handleParametersSearch = () => {
    onOpenChange(false);
    router.push("/search/parameters");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Search Type</DialogTitle>
          <DialogDescription>
            Select how you want to search for weather forecasts
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          {/* Location Search */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={handleLocationSearch}
          >
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Location Search</CardTitle>
              <CardDescription>
                Search by city, airport, or coordinates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Find weather for specific locations</li>
                <li>• Autocomplete city/airport names</li>
                <li>• View on interactive map</li>
                <li>• Select dates with calendar</li>
              </ul>
              <Button className="w-full" onClick={handleLocationSearch}>
                Search by Location
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Parameters Search */}
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={handleParametersSearch}
          >
            <CardHeader>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-4">
                <Filter className="h-6 w-6 text-amber-500" />
              </div>
              <CardTitle className="text-lg">Parameters Search</CardTitle>
              <CardDescription>
                Find locations matching your criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Filter by temperature range</li>
                <li>• Select date ranges</li>
                <li>• Discover matching locations</li>
                <li>• View results on map</li>
              </ul>
              <Button className="w-full" variant="outline" onClick={handleParametersSearch}>
                Search by Parameters
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


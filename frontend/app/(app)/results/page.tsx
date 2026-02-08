"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, 
  MapPin, 
  Calendar, 
  Trash2, 
  Eye, 
  Filter,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  AlertCircle,
  Thermometer,
  Wind,
  Clock
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "@/components/ui/use-toast";
import {
  getRecentSearchResults,
  deleteSearchResult,
  clearAllSearchResults,
  searchResultsByLocation,
  sortResults,
  type StoredSearchResult,
} from "@/lib/resultsStorageService";

type ViewMode = 'grid' | 'list';
type SortOption = 'date' | 'location' | 'matchCount';
type FilterOption = 'all' | 'location' | 'parameters' | 'advanced';

export default function ResultsWorkspacePage() {
  const router = useRouter();
  const [results, setResults] = useState<StoredSearchResult[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load results on mount
  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = () => {
    const storedResults = getRecentSearchResults();
    setResults(storedResults);
  };

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.searchType === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = searchResultsByLocation(searchQuery).filter(r => 
        filterType === 'all' || r.searchType === filterType
      );
    }

    // Sort
    return sortResults(filtered, sortBy, sortOrder);
  }, [results, filterType, searchQuery, sortBy, sortOrder]);

  const handleDelete = (id: string) => {
    if (deleteSearchResult(id)) {
      toast({
        title: "Result deleted",
        description: "The search result has been removed",
      });
      loadResults();
      setDeleteId(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to delete the result",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = () => {
    if (clearAllSearchResults()) {
      toast({
        title: "All results cleared",
        description: "Your search history has been cleared",
      });
      loadResults();
      setShowClearDialog(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to clear results",
        variant: "destructive",
      });
    }
  };

  const handleViewResult = (result: StoredSearchResult) => {
    // Encode result ID to retrieve later
    const searchId = result.id;
    
    // Navigate based on search type with restore ID and restore flag
    // The restore flag tells the search page not to save this as a new result
    if (result.searchType === 'parameters') {
      router.push(`/search/parameters?restoreId=${searchId}&restore=true`);
    } else if (result.searchType === 'location') {
      router.push(`/search?restoreId=${searchId}&restore=true`);
    } else {
      router.push(`/search/advanced?restoreId=${searchId}&restore=true`);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSearchTypeColor = (type: StoredSearchResult['searchType']) => {
    switch (type) {
      case 'parameters':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'location':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'advanced':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
  };

    return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Results Workspace"
        description="View and manage all your search results"
      />

      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-6">
          {/* Controls Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* First row: Filters and View Toggle */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('all')}
                    >
                      All
          </Button>
                    <Button
                      variant={filterType === 'location' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('location')}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      Location
          </Button>
            <Button
                      variant={filterType === 'parameters' ? 'default' : 'outline'}
              size="sm"
                      onClick={() => setFilterType('parameters')}
            >
                      <Filter className="h-3.5 w-3.5 mr-1" />
                      Parameters
            </Button>
            <Button
                      variant={filterType === 'advanced' ? 'default' : 'outline'}
              size="sm"
                      onClick={() => setFilterType('advanced')}
            >
                      <Thermometer className="h-3.5 w-3.5 mr-1" />
                      Advanced
            </Button>
                  </div>

                  <div className="flex gap-2">
              <Button 
                      variant="outline"
                size="sm" 
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {viewMode === 'grid' ? (
                        <List className="h-4 w-4" />
              ) : (
                        <Grid3x3 className="h-4 w-4" />
              )}
                    </Button>
      </div>
    </div>

                {/* Second row: Search and Sort */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
              </div>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="matchCount">Results</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                    </Button>

                    {results.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowClearDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
              </div>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          {filteredAndSortedResults.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <strong>{filteredAndSortedResults.length}</strong> result{filteredAndSortedResults.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Results Grid/List */}
          {filteredAndSortedResults.length === 0 ? (
            <EmptyState
              title="No search results"
              description={
                searchQuery 
                  ? "No results match your search query"
                  : filterType !== 'all'
                  ? `No ${filterType} searches found`
                  : "Start searching to see your results here"
              }
              action={{ label: "New Search", href: "/search" }}
              className="rounded-3xl"
            />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedResults.map((result) => (
                <Card key={result.id} className="rounded-3xl border border-border/60 bg-background/70 hover:border-primary/30 transition-colors">
          <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className={`mb-2 ${getSearchTypeColor(result.searchType)}`}>
                          {result.searchType}
                        </Badge>
                        <CardTitle className="text-base truncate">
                          {result.summary.location || 'Custom Search'}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(result.timestamp)}
                        </CardDescription>
                      </div>
                    </div>
          </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {result.summary.dateRange.start} → {result.summary.dateRange.end}
                        </span>
                      </div>
                      
                      {result.summary.matchCount !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{result.summary.matchCount} locations</span>
                        </div>
                      )}

                      {result.summary.avgTemp !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Avg: {result.summary.avgTemp.toFixed(1)}°C</span>
                        </div>
                      )}

                      {result.summary.params && result.summary.params.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.summary.params.map((param, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewResult(result)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                <Button
                        variant="destructive"
                  size="sm"
                        onClick={() => setDeleteId(result.id)}
                >
                        <Trash2 className="h-3.5 w-3.5" />
                </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-3xl">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredAndSortedResults.map((result) => (
                    <div key={result.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`${getSearchTypeColor(result.searchType)}`}>
                              {result.searchType}
                            </Badge>
                            <h3 className="font-semibold text-sm truncate">
                              {result.summary.location || 'Custom Search'}
                            </h3>
          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(result.timestamp)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {result.summary.dateRange.start} → {result.summary.dateRange.end}
                            </span>
                            {result.summary.matchCount !== undefined && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {result.summary.matchCount} locations
                              </span>
                            )}
                  </div>
                  </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResult(result)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(result.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                  </div>
                  </div>
                </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
              </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Search Result?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The search result will be permanently removed from your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Clear All Results?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {results.length} search result{results.length !== 1 ? 's' : ''} from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Clear All
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

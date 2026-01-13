/**
 * Results Storage Service
 * Manages storing and retrieving search results in localStorage
 */

export interface StoredSearchResult {
  id: string;
  timestamp: Date;
  searchType: 'location' | 'parameters' | 'advanced';
  query: Record<string, any>;
  summary: {
    location?: string;
    dateRange: { start: string; end: string };
    matchCount?: number;
    avgTemp?: number;
    params?: string[];
  };
  resultData?: any;
}

const STORAGE_KEY = 'weathersight_search_results';
const MAX_RESULTS = 100;
const MAX_AGE_DAYS = 30;

/**
 * Generate a unique ID for a search result
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all stored search results
 */
export function getRecentSearchResults(): StoredSearchResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const results = JSON.parse(stored) as StoredSearchResult[];
    
    // Convert timestamp strings back to Date objects
    return results.map(result => ({
      ...result,
      timestamp: new Date(result.timestamp),
    }));
  } catch (error) {
    console.error('Error reading search results from storage:', error);
    return [];
  }
}

/**
 * Save a new search result
 */
export function saveSearchResult(result: Omit<StoredSearchResult, 'id' | 'timestamp'>): string {
  try {
    const existingResults = getRecentSearchResults();
    
    const newResult: StoredSearchResult = {
      ...result,
      id: generateId(),
      timestamp: new Date(),
    };

    // Add to the beginning of the array
    const updatedResults = [newResult, ...existingResults];

    // Limit to MAX_RESULTS
    const trimmedResults = updatedResults.slice(0, MAX_RESULTS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedResults));
    
    return newResult.id;
  } catch (error) {
    console.error('Error saving search result:', error);
    throw error;
  }
}

/**
 * Delete a specific search result by ID
 */
export function deleteSearchResult(id: string): boolean {
  try {
    const results = getRecentSearchResults();
    const filteredResults = results.filter(r => r.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredResults));
    return true;
  } catch (error) {
    console.error('Error deleting search result:', error);
    return false;
  }
}

/**
 * Clear all stored search results
 */
export function clearAllSearchResults(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing search results:', error);
    return false;
  }
}

/**
 * Clear old results that are older than MAX_AGE_DAYS
 */
export function clearOldResults(): number {
  try {
    const results = getRecentSearchResults();
    const now = new Date();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    const recentResults = results.filter(result => {
      const age = now.getTime() - new Date(result.timestamp).getTime();
      return age < maxAge;
    });

    const removedCount = results.length - recentResults.length;

    if (removedCount > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentResults));
    }

    return removedCount;
  } catch (error) {
    console.error('Error clearing old results:', error);
    return 0;
  }
}

/**
 * Get a specific search result by ID
 */
export function getSearchResultById(id: string): StoredSearchResult | null {
  const results = getRecentSearchResults();
  return results.find(r => r.id === id) || null;
}

/**
 * Filter results by search type
 */
export function filterResultsByType(type: StoredSearchResult['searchType']): StoredSearchResult[] {
  const results = getRecentSearchResults();
  return results.filter(r => r.searchType === type);
}

/**
 * Search results by location name
 */
export function searchResultsByLocation(query: string): StoredSearchResult[] {
  const results = getRecentSearchResults();
  const lowerQuery = query.toLowerCase();
  
  return results.filter(r => 
    r.summary.location?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sort results by different criteria
 */
export function sortResults(
  results: StoredSearchResult[],
  sortBy: 'date' | 'location' | 'matchCount',
  order: 'asc' | 'desc' = 'desc'
): StoredSearchResult[] {
  const sorted = [...results].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'location':
        comparison = (a.summary.location || '').localeCompare(b.summary.location || '');
        break;
      case 'matchCount':
        comparison = (a.summary.matchCount || 0) - (b.summary.matchCount || 0);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// Auto-cleanup on load (run once)
if (typeof window !== 'undefined') {
  clearOldResults();
}


import { NextRequest, NextResponse } from "next/server";
import { tiers, type TierId } from "@/lib/tiers";

// In-memory storage for demo (replace with database in production)
interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  displayName?: string;
  dayOfYear?: number;
  resolution: "daily" | "weekly" | "monthly";
  forecastType: "standard" | "probabilistic" | "extreme";
  isFavorite: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock storage - in production this would be Supabase
const savedSearchesStore: Map<string, SavedSearch[]> = new Map();

function getUserSearches(userId: string): SavedSearch[] {
  return savedSearchesStore.get(userId) || [];
}

function setUserSearches(userId: string, searches: SavedSearch[]): void {
  savedSearchesStore.set(userId, searches);
}

/**
 * GET /api/saved-searches
 * List all saved searches for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from auth (mock for now - replace with real auth)
    const userId = request.headers.get("x-user-id") || "demo-user";
    const tierHeader = request.headers.get("x-user-tier") as TierId | null;
    const tier: TierId = tierHeader || "basic";

    const searches = getUserSearches(userId);
    const tierDef = tiers[tier];
    const limit = tierDef.gating.maxLocations;

    // Sort by favorite first, then by last used
    const sortedSearches = [...searches].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      searches: sortedSearches,
      count: searches.length,
      limit: limit,
      canSaveMore: limit === "unlimited" || searches.length < limit,
    });
  } catch (error) {
    console.error("Error fetching saved searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved searches" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-searches
 * Create a new saved search (with tier limit check)
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from auth (mock for now - replace with real auth)
    const userId = request.headers.get("x-user-id") || "demo-user";
    const tierHeader = request.headers.get("x-user-tier") as TierId | null;
    const tier: TierId = tierHeader || "basic";

    const body = await request.json();
    const { name, location, lat, lon, displayName, dayOfYear, resolution, forecastType } = body;

    // Validate required fields
    if (!name || !location || lat === undefined || lon === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, location, lat, lon" },
        { status: 400 }
      );
    }

    // Check tier limit
    const searches = getUserSearches(userId);
    const tierDef = tiers[tier];
    const limit = tierDef.gating.maxLocations;

    if (limit !== "unlimited" && searches.length >= limit) {
      return NextResponse.json(
        {
          error: `Saved search limit (${limit}) reached on ${tierDef.name} plan`,
          upgradeRequired: true,
          currentCount: searches.length,
          limit: limit,
        },
        { status: 403 }
      );
    }

    // Create new saved search
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      location,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      displayName: displayName || undefined,
      dayOfYear: dayOfYear ? parseInt(dayOfYear) : undefined,
      resolution: resolution || "daily",
      forecastType: forecastType || "standard",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to storage
    setUserSearches(userId, [...searches, newSearch]);

    return NextResponse.json({
      search: newSearch,
      count: searches.length + 1,
      limit: limit,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating saved search:", error);
    return NextResponse.json(
      { error: "Failed to create saved search" },
      { status: 500 }
    );
  }
}


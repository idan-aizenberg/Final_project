import { NextRequest, NextResponse } from "next/server";

// In-memory storage reference (shared with parent route)
// In production, this would be database queries
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

// Mock storage - shared with parent route
const savedSearchesStore: Map<string, SavedSearch[]> = new Map();

function getUserSearches(userId: string): SavedSearch[] {
  return savedSearchesStore.get(userId) || [];
}

function setUserSearches(userId: string, searches: SavedSearch[]): void {
  savedSearchesStore.set(userId, searches);
}

/**
 * PATCH /api/saved-searches/[id]
 * Update a saved search (name, favorite status, or mark as used)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const { id } = params;
    const body = await request.json();

    const searches = getUserSearches(userId);
    const searchIndex = searches.findIndex((s) => s.id === id);

    if (searchIndex === -1) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 }
      );
    }

    // Update allowed fields
    const updatedSearch: SavedSearch = {
      ...searches[searchIndex],
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updatedSearch.name = body.name;
    }

    if (body.isFavorite !== undefined) {
      updatedSearch.isFavorite = body.isFavorite;
    }

    if (body.markAsUsed) {
      updatedSearch.lastUsedAt = new Date().toISOString();
    }

    // Save updated search
    searches[searchIndex] = updatedSearch;
    setUserSearches(userId, searches);

    return NextResponse.json({ search: updatedSearch });
  } catch (error) {
    console.error("Error updating saved search:", error);
    return NextResponse.json(
      { error: "Failed to update saved search" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-searches/[id]
 * Delete a saved search
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const { id } = params;

    const searches = getUserSearches(userId);
    const searchIndex = searches.findIndex((s) => s.id === id);

    if (searchIndex === -1) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 }
      );
    }

    // Remove the search
    const deletedSearch = searches[searchIndex];
    searches.splice(searchIndex, 1);
    setUserSearches(userId, searches);

    return NextResponse.json({
      success: true,
      message: "Saved search deleted",
      deletedId: deletedSearch.id,
      remainingCount: searches.length,
    });
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return NextResponse.json(
      { error: "Failed to delete saved search" },
      { status: 500 }
    );
  }
}


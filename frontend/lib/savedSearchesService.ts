import { supabase } from "./supabase";

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  display_name?: string;
  day_of_year?: number;
  resolution: "daily" | "weekly" | "monthly";
  forecast_type: "standard" | "probabilistic" | "extreme";
  is_favorite: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

// Transform from database snake_case to camelCase for frontend
function transformToFrontend(dbRecord: any): SavedSearch {
  return {
    id: dbRecord.id,
    user_id: dbRecord.user_id,
    name: dbRecord.name,
    location: dbRecord.location,
    lat: parseFloat(dbRecord.lat),
    lon: parseFloat(dbRecord.lon),
    display_name: dbRecord.display_name,
    day_of_year: dbRecord.day_of_year,
    resolution: dbRecord.resolution,
    forecast_type: dbRecord.forecast_type,
    is_favorite: dbRecord.is_favorite,
    last_used_at: dbRecord.last_used_at,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
  };
}

/**
 * Fetch all saved searches for the current user
 * Throws error if user is not authenticated (triggers localStorage fallback)
 */
export async function fetchSavedSearchesFromDB(): Promise<{
  searches: SavedSearch[];
  count: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("No authenticated Supabase user");
  }

  const { data, error, count } = await supabase
    .from("saved_searches")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching saved searches:", error);
    throw new Error(error.message);
  }

  const searches = (data || []).map(transformToFrontend);
  return { searches, count: count || 0 };
}

/**
 * Create a new saved search
 */
export async function createSavedSearchInDB(input: {
  name: string;
  location: string;
  lat: number;
  lon: number;
  displayName?: string;
  dayOfYear?: number;
  resolution?: "daily" | "weekly" | "monthly";
  forecastType?: "standard" | "probabilistic" | "extreme";
}): Promise<SavedSearch> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated to save searches");
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: user.id,
      name: input.name,
      location: input.location,
      lat: input.lat,
      lon: input.lon,
      display_name: input.displayName,
      day_of_year: input.dayOfYear,
      resolution: input.resolution || "daily",
      forecast_type: input.forecastType || "standard",
      is_favorite: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating saved search:", error);
    throw new Error(error.message);
  }

  return transformToFrontend(data);
}

/**
 * Update a saved search (name, favorite status)
 */
export async function updateSavedSearchInDB(
  id: string,
  updates: {
    name?: string;
    isFavorite?: boolean;
    lastUsedAt?: string;
  }
): Promise<SavedSearch> {
  const updateData: any = {};
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.isFavorite !== undefined) {
    updateData.is_favorite = updates.isFavorite;
  }
  if (updates.lastUsedAt !== undefined) {
    updateData.last_used_at = updates.lastUsedAt;
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating saved search:", error);
    throw new Error(error.message);
  }

  return transformToFrontend(data);
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearchFromDB(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting saved search:", error);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Mark a saved search as used (updates last_used_at)
 */
export async function markSearchAsUsedInDB(id: string): Promise<SavedSearch> {
  return updateSavedSearchInDB(id, { lastUsedAt: new Date().toISOString() });
}

/**
 * Get the count of saved searches for the current user
 */
export async function getSavedSearchCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("saved_searches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error getting saved search count:", error);
    return 0;
  }

  return count || 0;
}


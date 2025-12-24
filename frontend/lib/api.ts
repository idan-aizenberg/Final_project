import { addDays, eachDayOfInterval, formatISO } from "date-fns";
import { sleep } from "@/lib/utils";
import type { TierId } from "@/lib/tiers";

export type Resolution = "daily" | "weekly" | "monthly";
export type ForecastType = "standard" | "probabilistic" | "extreme";
export type OutputFormat = "table" | "charts" | "download";

export interface ForecastQuery {
  id: string;
  location: string;
  coordinates?: [number, number];
  startDate: string;
  endDate: string;
  resolution: Resolution;
  forecastType: ForecastType;
  output: OutputFormat;
  preset?: string | null;
  createdAt: string;
  cost: number;
}

export interface UsageSummary {
  tier: TierId;
  usedToday: number;
  nextReset: string;
}

export interface ForecastMetricPoint {
  date: string;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  precipMm: number;
  precipProb: number;
  windSpeed: number;
  humidity: number;
  uv: number;
  pressure: number;
}

export interface ProbabilityBand {
  date: string;
  probability: number;
  lower: number;
  upper: number;
}

export interface ExtremeEvent {
  id: string;
  type: "Heatwave" | "Frost" | "Storm" | "Heavy Rain" | "Wind";
  probability: number;
  severity: "low" | "medium" | "high";
  onsetWindow: { start: string; end: string };
  durationHours: number;
  narrative: string;
}

export interface ForecastResult {
  id: string;
  generatedAt: string;
  metrics: ForecastMetricPoint[];
  weeklySummaries: Array<{
    weekOf: string;
    narrative: string;
    riskLevel: "low" | "medium" | "high";
  }>;
  probabilities: ProbabilityBand[];
  extremeEvents: ExtremeEvent[];
}

export interface AlertInput {
  name: string;
  location: string;
  condition: string;
  threshold: number;
  channel: Array<"email" | "sms" | "push">;
  frequency: "realtime" | "daily" | "weekly";
  window: number;
}

export interface Alert extends AlertInput {
  id: string;
  createdAt: string;
  status: "active" | "paused";
}

const latency = { short: 320, medium: 680 };

let recentSearches: ForecastQuery[] = [
  {
    id: "tlv-standard",
    location: "Tel Aviv, Israel",
    coordinates: [32.0853, 34.7818],
    startDate: formatISO(addDays(new Date(), -7), { representation: "date" }),
    endDate: formatISO(addDays(new Date(), 7), { representation: "date" }),
    resolution: "daily",
    forecastType: "standard",
    output: "charts",
    preset: "Heatwave watch",
    createdAt: new Date().toISOString(),
    cost: 2,
  },
  {
    id: "sfo-probabilistic",
    location: "San Francisco, USA",
    coordinates: [37.7749, -122.4194],
    startDate: formatISO(addDays(new Date(), -14), { representation: "date" }),
    endDate: formatISO(addDays(new Date(), 21), { representation: "date" }),
    resolution: "weekly",
    forecastType: "probabilistic",
    output: "charts",
    preset: "Fog risk",
    createdAt: addDays(new Date(), -2).toISOString(),
    cost: 4,
  },
];

let alerts: Alert[] = [
  {
    id: "alert-1",
    name: "Heatwave Watch",
    location: "Tel Aviv",
    condition: "Heatwave probability",
    threshold: 0.8,
    channel: ["email"],
    frequency: "daily",
    window: 14,
    createdAt: addDays(new Date(), -5).toISOString(),
    status: "active",
  },
  {
    id: "alert-2",
    name: "Storm Risk",
    location: "Rotterdam",
    condition: "Extreme wind risk",
    threshold: 0.6,
    channel: ["email", "sms"],
    frequency: "realtime",
    window: 7,
    createdAt: addDays(new Date(), -12).toISOString(),
    status: "paused",
  },
];

const usage: UsageSummary = {
  tier: "professional",
  usedToday: 18,
  nextReset: addDays(new Date(), 1).toISOString(),
};

const resultsStore: Record<string, ForecastResult> = {};

function seedMetricPoint(date: Date, index: number): ForecastMetricPoint {
  const baseTemp = 18 + Math.sin(index / 2) * 6;
  const precip = Math.max(0, Math.sin(index / 1.5) * 15 + 5);
  const precipProb = Math.min(0.95, Math.max(0.05, precip / 30));
  return {
    date: formatISO(date, { representation: "date" }),
    minTemp: baseTemp - 4,
    maxTemp: baseTemp + 4,
    avgTemp: baseTemp,
    precipMm: precip,
    precipProb,
    windSpeed: 10 + Math.sin(index / 3) * 6,
    humidity: 55 + Math.sin(index / 5) * 20,
    uv: 6 + Math.cos(index / 4) * 2,
    pressure: 1012 + Math.cos(index) * 8,
  };
}

function buildProbabilities(points: ForecastMetricPoint[]): ProbabilityBand[] {
  return points.map((metric) => {
    const variability = Math.max(0.05, 0.25 - metric.precipProb / 4);
    return {
      date: metric.date,
      probability: metric.precipProb,
      lower: Math.max(metric.precipProb - variability, 0),
      upper: Math.min(metric.precipProb + variability, 1),
    };
  });
}

function buildExtremes(points: ForecastMetricPoint[]): ExtremeEvent[] {
  const storms = points.filter((point) => point.windSpeed > 18);
  return storms.slice(0, 3).map((item, idx) => ({
    id: `extreme-${idx}`,
    type: idx === 0 ? "Wind" : idx === 1 ? "Storm" : "Heavy Rain",
    probability: Math.min(0.95, 0.5 + idx * 0.15),
    severity: idx === 0 ? "medium" : idx === 1 ? "high" : "medium",
    onsetWindow: {
      start: item.date,
      end: formatISO(addDays(new Date(item.date), 2), { representation: "date" }),
    },
    durationHours: 12 + idx * 6,
    narrative: idx === 1
      ? "Short-lived gale with high coastal gusts."
      : "Elevated wind and convective showers expected.",
  }));
}

export async function fetchRecentSearches(): Promise<ForecastQuery[]> {
  await sleep(latency.short);
  return recentSearches;
}

export async function saveRecentSearch(search: ForecastQuery) {
  await sleep(latency.short);
  recentSearches = [search, ...recentSearches.filter((s) => s.id !== search.id)].slice(0, 6);
  return search;
}

export async function runForecastQuery(params: Omit<ForecastQuery, "id" | "createdAt" | "cost"> & { cost?: number; }): Promise<ForecastResult> {
  await sleep(latency.medium);
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const points = eachDayOfInterval({ start, end }).map((date, index) => seedMetricPoint(date, index));
  const weeklySummaries = points
    .filter((_, idx) => idx % 7 === 0)
    .map((point) => ({
      weekOf: point.date,
      narrative: point.avgTemp > 24
        ? "Warm spell with higher humidity. Prepare hydration measures."
        : "Seasonal temperatures with light precipitation risk.",
      riskLevel: (point.precipProb > 0.6 ? "medium" : point.avgTemp > 26 ? "medium" : "low") as "low" | "medium" | "high",
    }));

  const result: ForecastResult = {
    id: `result-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    metrics: points,
    weeklySummaries,
    probabilities: buildProbabilities(points),
    extremeEvents: buildExtremes(points),
  };

  resultsStore[result.id] = result;

  const cost = params.cost ?? Math.max(1, Math.round(points.length / 7));
  await saveRecentSearch({
    id: result.id,
    location: params.location,
    coordinates: params.coordinates,
    startDate: params.startDate,
    endDate: params.endDate,
    resolution: params.resolution,
    forecastType: params.forecastType,
    output: params.output,
    preset: params.preset,
    createdAt: new Date().toISOString(),
    cost,
  });

  return result;
}

export async function fetchAlerts(): Promise<Alert[]> {
  await sleep(latency.short);
  return alerts;
}

export async function fetchForecastResult(id: string): Promise<ForecastResult | undefined> {
  await sleep(latency.short);
  return resultsStore[id];
}

export async function createAlert(payload: AlertInput): Promise<Alert> {
  await sleep(latency.short);
  const alert: Alert = {
    ...payload,
    id: `alert-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  alerts = [alert, ...alerts];
  return alert;
}

export async function updateAlert(id: string, patch: Partial<Alert>): Promise<Alert> {
  await sleep(latency.short);
  alerts = alerts.map((alert) => (alert.id === id ? { ...alert, ...patch } : alert));
  return alerts.find((alert) => alert.id === id)!;
}

export async function deleteAlert(id: string) {
  await sleep(latency.short);
  alerts = alerts.filter((alert) => alert.id !== id);
  return true;
}

export async function fetchUsage(): Promise<UsageSummary> {
  await sleep(latency.short);
  return usage;
}

// ==================== Saved Searches ====================
// Uses Supabase when configured, otherwise falls back to in-memory storage

import {
  fetchSavedSearchesFromDB,
  createSavedSearchInDB,
  updateSavedSearchInDB,
  deleteSavedSearchFromDB,
  markSearchAsUsedInDB,
  type SavedSearch as DbSavedSearch,
} from "./savedSearchesService";

export interface SavedSearch {
  id: string;
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
}

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-key"
  );
};

// Transform DB record to frontend format
function transformDbToFrontend(dbSearch: DbSavedSearch): SavedSearch {
  return {
    id: dbSearch.id,
    name: dbSearch.name,
    location: dbSearch.location,
    lat: dbSearch.lat,
    lon: dbSearch.lon,
    displayName: dbSearch.display_name,
    dayOfYear: dbSearch.day_of_year,
    resolution: dbSearch.resolution,
    forecastType: dbSearch.forecast_type,
    isFavorite: dbSearch.is_favorite,
    lastUsedAt: dbSearch.last_used_at,
    createdAt: dbSearch.created_at,
  };
}

// LocalStorage key for fallback storage
const SAVED_SEARCHES_KEY = "weathersight_saved_searches";

// Helper to load saved searches from localStorage
function loadSavedSearchesFromStorage(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SAVED_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save searches to localStorage
function saveSavedSearchesToStorage(searches: SavedSearch[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
}

export async function fetchSavedSearches(): Promise<{ searches: SavedSearch[]; count: number }> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const result = await fetchSavedSearchesFromDB();
      return {
        searches: result.searches.map(transformDbToFrontend),
        count: result.count,
      };
    } catch (error) {
      console.warn("Supabase fetch failed, falling back to localStorage:", error);
    }
  }

  // Fallback to localStorage
  await sleep(latency.short);
  const savedSearchesMock = loadSavedSearchesFromStorage();
  const sorted = [...savedSearchesMock].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    const aTime = a.lastUsedAt || a.createdAt;
    const bTime = b.lastUsedAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
  return { searches: sorted, count: sorted.length };
}

export async function createSavedSearch(
  input: Omit<SavedSearch, "id" | "createdAt" | "isFavorite" | "lastUsedAt">
): Promise<SavedSearch> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const result = await createSavedSearchInDB({
        name: input.name,
        location: input.location,
        lat: input.lat,
        lon: input.lon,
        displayName: input.displayName,
        dayOfYear: input.dayOfYear,
        resolution: input.resolution,
        forecastType: input.forecastType,
      });
      return transformDbToFrontend(result);
    } catch (error) {
      console.warn("Supabase create failed, falling back to localStorage:", error);
    }
  }

  // Fallback to localStorage
  await sleep(latency.short);
  const newSearch: SavedSearch = {
    ...input,
    id: `saved-${Date.now()}`,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };
  const existing = loadSavedSearchesFromStorage();
  saveSavedSearchesToStorage([newSearch, ...existing]);
  return newSearch;
}

export async function updateSavedSearch(
  id: string,
  updates: Partial<Pick<SavedSearch, "name" | "isFavorite" | "lastUsedAt">>
): Promise<SavedSearch | null> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const result = await updateSavedSearchInDB(id, {
        name: updates.name,
        isFavorite: updates.isFavorite,
        lastUsedAt: updates.lastUsedAt,
      });
      return transformDbToFrontend(result);
    } catch (error) {
      console.warn("Supabase update failed, falling back to localStorage:", error);
    }
  }

  // Fallback to localStorage
  await sleep(latency.short);
  const existing = loadSavedSearchesFromStorage();
  const index = existing.findIndex((s) => s.id === id);
  if (index === -1) return null;
  existing[index] = { ...existing[index], ...updates };
  saveSavedSearchesToStorage(existing);
  return existing[index];
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      return await deleteSavedSearchFromDB(id);
    } catch (error) {
      console.warn("Supabase delete failed, falling back to localStorage:", error);
    }
  }

  // Fallback to localStorage
  await sleep(latency.short);
  const existing = loadSavedSearchesFromStorage();
  const filtered = existing.filter((s) => s.id !== id);
  if (filtered.length === existing.length) return false;
  saveSavedSearchesToStorage(filtered);
  return true;
}

export async function markSearchAsUsed(id: string): Promise<SavedSearch | null> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const result = await markSearchAsUsedInDB(id);
      return transformDbToFrontend(result);
    } catch (error) {
      console.warn("Supabase mark as used failed, falling back to mock:", error);
    }
  }

  // Fallback
  return updateSavedSearch(id, { lastUsedAt: new Date().toISOString() });
}

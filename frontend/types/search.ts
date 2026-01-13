import type { ForecastType, OutputFormat, Resolution } from "@/lib/api";

export interface SearchFormValues {
  location: string;
  latitude?: number;
  longitude?: number;
  range: {
    start: string;
    end: string;
  };
  resolution: Resolution;
  forecastType: ForecastType;
  output: OutputFormat;
  preset?: string | null;
  units: {
    temperature: "c" | "f";
    precipitation: "mm" | "in";
  };
  autoAlert?: boolean;
}

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
  updatedAt?: string;
}

export interface SavedSearchesResponse {
  searches: SavedSearch[];
  count: number;
  limit: number | "unlimited";
  canSaveMore: boolean;
}

export interface SaveSearchInput {
  name: string;
  location: string;
  lat: number;
  lon: number;
  displayName?: string;
  dayOfYear?: number;
  resolution?: "daily" | "weekly" | "monthly";
  forecastType?: "standard" | "probabilistic" | "extreme";
}

export interface LocationResult {
  gridIndex: number;
  location: { lat: number; lon: number };
  temperature: number;
  maxTemperature?: number;
  minTemperature?: number;
  precipitationSum?: number;
  snowfallAmount?: number;
  solarRadiation?: number;
  windSpeed?: number;
  windSpeedU?: number;
  windSpeedV?: number;
  dayOfYear: number;
}

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

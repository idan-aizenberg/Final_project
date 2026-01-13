export function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}

export function formatTemperature(value: number, unit: "c" | "f") {
  if (unit === "f") {
    return `${Math.round(value * 1.8 + 32)}°F`;
  }
  return `${Math.round(value)}°C`;
}

export function formatPrecip(value: number, unit: "mm" | "in") {
  const converted = unit === "in" ? value / 25.4 : value;
  const suffix = unit === "in" ? "in" : "mm";
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: unit === "in" ? 2 : 0,
  });
  return `${formatter.format(converted)} ${suffix}`;
}

export function formatDateRange(start: Date, end: Date, locale = "en-US") {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatDate(value: Date | string, locale = "en-US") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value);
}

/**
 * Convert a Date to day of year (1-365)
 * @param date - The date to convert
 * @returns Day of year (1-365)
 */
export function getDayOfYearFromDate(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Convert day of year to a Date object
 * @param dayOfYear - Day of year (1-365)
 * @param year - Year (defaults to 2025)
 * @returns Date object
 */
export function getDateFromDayOfYear(dayOfYear: number, year: number = 2025): Date {
  const date = new Date(year, 0);
  date.setDate(dayOfYear);
  return date;
}

/**
 * Validate a date range for the weather search
 * @param from - Start date (required)
 * @param to - End date (optional, defaults to from)
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  from: Date | undefined,
  to?: Date | undefined
): { valid: boolean; error?: string } {
  if (!from) {
    return { valid: false, error: "Please select a start date" };
  }

  if (from.getFullYear() !== 2025) {
    return { valid: false, error: "Date must be in 2025" };
  }

  if (to && to < from) {
    return { valid: false, error: "End date must be after start date" };
  }

  if (to && to.getFullYear() !== 2025) {
    return { valid: false, error: "End date must be in 2025" };
  }

  return { valid: true };
}

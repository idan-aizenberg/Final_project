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

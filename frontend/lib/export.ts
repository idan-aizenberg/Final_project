import { tiers, type TierId } from "./tiers";
import { canExport as validateExport } from "./tierValidation";
import type { ForecastMetricPoint, ForecastResult } from "./api";

export type ExportFormat = "csv" | "pdf" | "excel";

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  temperatureUnit?: "c" | "f";
  precipUnit?: "mm" | "in";
}

/**
 * Check if user can export in a specific format
 */
export function canExportFormat(tier: TierId, format: ExportFormat): boolean {
  return tiers[tier].gating.exports.includes(format);
}

/**
 * Get available export formats for a tier
 */
export function getAvailableExportFormats(tier: TierId): ExportFormat[] {
  return tiers[tier].gating.exports;
}

/**
 * Format temperature based on unit preference
 */
function formatTemperature(celsius: number, unit: "c" | "f"): string {
  if (unit === "f") {
    return `${(celsius * 1.8 + 32).toFixed(1)}°F`;
  }
  return `${celsius.toFixed(1)}°C`;
}

/**
 * Format precipitation based on unit preference
 */
function formatPrecipitation(mm: number, unit: "mm" | "in"): string {
  if (unit === "in") {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

/**
 * Convert forecast data to CSV format
 */
export function convertToCSV(
  data: ForecastMetricPoint[],
  options: ExportOptions = {}
): string {
  const { 
    includeHeaders = true, 
    temperatureUnit = "c", 
    precipUnit = "mm" 
  } = options;

  const headers = [
    "Date",
    "Avg Temp",
    "Min Temp",
    "Max Temp",
    "Precipitation",
    "Precip Probability",
    "Wind Speed (km/h)",
    "Humidity (%)",
    "UV Index",
    "Pressure (hPa)",
  ];

  const rows = data.map((point) => [
    point.date,
    formatTemperature(point.avgTemp, temperatureUnit),
    formatTemperature(point.minTemp, temperatureUnit),
    formatTemperature(point.maxTemp, temperatureUnit),
    formatPrecipitation(point.precipMm, precipUnit),
    `${(point.precipProb * 100).toFixed(0)}%`,
    point.windSpeed.toFixed(1),
    point.humidity.toFixed(0),
    point.uv.toFixed(1),
    point.pressure.toFixed(0),
  ]);

  const csvContent = includeHeaders
    ? [headers, ...rows].map((row) => row.join(",")).join("\n")
    : rows.map((row) => row.join(",")).join("\n");

  return csvContent;
}

/**
 * Export forecast data to CSV file
 */
export async function exportToCSV(
  tier: TierId,
  data: ForecastMetricPoint[],
  options: ExportOptions = {}
): Promise<Blob> {
  const validation = validateExport(tier, "csv");
  if (!validation.allowed) {
    throw new Error(validation.reason || "CSV export not available on your plan");
  }

  const csvContent = convertToCSV(data, options);
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * Generate PDF content (returns HTML for PDF generation)
 */
export function generatePDFContent(
  result: ForecastResult,
  location: string,
  options: ExportOptions = {}
): string {
  const { temperatureUnit = "c", precipUnit = "mm" } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>WeatherSight Forecast Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #1a1a1a;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #3b82f6;
          margin-bottom: 8px;
        }
        .header p {
          color: #666;
          margin: 0;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .meta-item {
          text-align: center;
        }
        .meta-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .meta-value {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #e5e5e5;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
        }
        td {
          font-size: 14px;
        }
        .summary {
          background: #eff6ff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .summary h3 {
          color: #3b82f6;
          margin-top: 0;
        }
        .footer {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>WeatherSight</h1>
        <p>Probabilistic Weather Intelligence Report</p>
      </div>
      
      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Location</div>
          <div class="meta-value">${location}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated</div>
          <div class="meta-value">${new Date(result.generatedAt).toLocaleDateString()}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Forecast Days</div>
          <div class="meta-value">${result.metrics.length}</div>
        </div>
      </div>

      ${result.weeklySummaries.length > 0 ? `
        <div class="summary">
          <h3>Weekly Summary</h3>
          ${result.weeklySummaries.map(week => `
            <p><strong>Week of ${week.weekOf}:</strong> ${week.narrative} (Risk: ${week.riskLevel})</p>
          `).join('')}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Avg</th>
            <th>Min</th>
            <th>Max</th>
            <th>Precip</th>
            <th>Wind</th>
            <th>Humidity</th>
          </tr>
        </thead>
        <tbody>
          ${result.metrics.map(point => `
            <tr>
              <td>${point.date}</td>
              <td>${formatTemperature(point.avgTemp, temperatureUnit)}</td>
              <td>${formatTemperature(point.minTemp, temperatureUnit)}</td>
              <td>${formatTemperature(point.maxTemp, temperatureUnit)}</td>
              <td>${formatPrecipitation(point.precipMm, precipUnit)}</td>
              <td>${point.windSpeed.toFixed(0)} km/h</td>
              <td>${point.humidity.toFixed(0)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${result.extremeEvents.length > 0 ? `
        <div class="summary">
          <h3>Extreme Event Alerts</h3>
          ${result.extremeEvents.map(event => `
            <p><strong>${event.type}</strong> (${event.severity} severity, ${(event.probability * 100).toFixed(0)}% probability): ${event.narrative}</p>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated by WeatherSight • ${new Date().toISOString()}</p>
        <p>This report contains probabilistic forecasts and should be used for planning purposes only.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Export forecast data to PDF
 */
export async function exportToPDF(
  tier: TierId,
  result: ForecastResult,
  location: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const validation = validateExport(tier, "pdf");
  if (!validation.allowed) {
    throw new Error(validation.reason || "PDF export not available on your plan");
  }

  const html = generatePDFContent(result, location, options);
  
  // In a real implementation, you'd use a PDF generation library like jsPDF or puppeteer
  // For now, return the HTML as a blob that can be printed to PDF
  return new Blob([html], { type: "text/html;charset=utf-8;" });
}

/**
 * Convert forecast data to Excel-compatible format (TSV for simplicity)
 */
export function convertToExcel(
  data: ForecastMetricPoint[],
  options: ExportOptions = {}
): string {
  const { temperatureUnit = "c", precipUnit = "mm" } = options;

  const headers = [
    "Date",
    "Avg Temp",
    "Min Temp",
    "Max Temp",
    "Precipitation",
    "Precip Probability",
    "Wind Speed (km/h)",
    "Humidity (%)",
    "UV Index",
    "Pressure (hPa)",
  ];

  const rows = data.map((point) => [
    point.date,
    temperatureUnit === "f" ? (point.avgTemp * 1.8 + 32).toFixed(1) : point.avgTemp.toFixed(1),
    temperatureUnit === "f" ? (point.minTemp * 1.8 + 32).toFixed(1) : point.minTemp.toFixed(1),
    temperatureUnit === "f" ? (point.maxTemp * 1.8 + 32).toFixed(1) : point.maxTemp.toFixed(1),
    precipUnit === "in" ? (point.precipMm / 25.4).toFixed(2) : point.precipMm.toFixed(1),
    (point.precipProb * 100).toFixed(0),
    point.windSpeed.toFixed(1),
    point.humidity.toFixed(0),
    point.uv.toFixed(1),
    point.pressure.toFixed(0),
  ]);

  // Use tab-separated values for Excel compatibility
  const content = [headers, ...rows].map((row) => row.join("\t")).join("\n");
  return content;
}

/**
 * Export forecast data to Excel format
 */
export async function exportToExcel(
  tier: TierId,
  data: ForecastMetricPoint[],
  options: ExportOptions = {}
): Promise<Blob> {
  const validation = validateExport(tier, "excel");
  if (!validation.allowed) {
    throw new Error(validation.reason || "Excel export not available on your plan");
  }

  const content = convertToExcel(data, options);
  return new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
}

/**
 * Trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download forecast data
 */
export async function exportAndDownload(
  tier: TierId,
  format: ExportFormat,
  data: ForecastMetricPoint[] | ForecastResult,
  location: string,
  options: ExportOptions = {}
): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const baseFilename = options.filename || `weathersight-${location.toLowerCase().replace(/\s+/g, "-")}-${timestamp}`;

  let blob: Blob;
  let filename: string;

  switch (format) {
    case "csv":
      const csvData = Array.isArray(data) ? data : data.metrics;
      blob = await exportToCSV(tier, csvData, options);
      filename = `${baseFilename}.csv`;
      break;
    case "pdf":
      if (Array.isArray(data)) {
        throw new Error("PDF export requires full forecast result, not just metrics");
      }
      blob = await exportToPDF(tier, data, location, options);
      filename = `${baseFilename}.html`; // HTML for now, can be printed as PDF
      break;
    case "excel":
      const excelData = Array.isArray(data) ? data : data.metrics;
      blob = await exportToExcel(tier, excelData, options);
      filename = `${baseFilename}.xls`;
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  downloadBlob(blob, filename);
}


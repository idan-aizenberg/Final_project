"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface WeatherMapProps {
  dayOfYear: number;
  onLocationClick: (lat: number, lon: number) => void;
  selectedGridIndex?: number;
  highlightLocation?: { lat: number; lon: number };
}

interface GridPointWithTemp {
  gridIndex: number;
  lat: number;
  lon: number;
  temperature: number;
}

interface TempRange {
  min: number;
  max: number;
}

// Component to handle map click events
function MapClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);

  return null;
}

// Component to fit bounds when highlight location changes
function MapBoundsUpdater({ location }: { location?: { lat: number; lon: number } }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lon], 8, { animate: true });
    }
  }, [location, map]);

  return null;
}

export function WeatherMap({
  dayOfYear,
  onLocationClick,
  selectedGridIndex,
  highlightLocation,
}: WeatherMapProps) {
  const [gridPoints, setGridPoints] = useState<GridPointWithTemp[]>([]);
  const [tempRange, setTempRange] = useState<TempRange>({ min: -20, max: 40 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, [dayOfYear]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Load temperature range for color scaling
      const rangeResponse = await fetch(`/api/weather/range?day=${dayOfYear}`);
      if (rangeResponse.ok) {
        const range = await rangeResponse.json();
        setTempRange(range);
      }

      // Load grid points with temperatures (sampled for performance)
      // Using sample=true returns every 10th point (~1,300 points instead of 13,000)
      const gridResponse = await fetch(`/api/weather/grid?day=${dayOfYear}&sample=true`);
      if (gridResponse.ok) {
        const gridData = await gridResponse.json();
        setGridPoints(gridData.points || []);
        console.log(`Loaded ${gridData.points?.length || 0} grid points for day ${dayOfYear}`);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get color for temperature using a gradient
   * Blue (cold) -> Cyan -> Green -> Yellow -> Orange -> Red (hot)
   */
  const getColorForTemp = (temp: number): string => {
    const { min, max } = tempRange;
    const normalized = Math.max(0, Math.min(1, (temp - min) / (max - min)));

    if (normalized < 0.2) {
      // Very cold: Blue
      return `rgb(${Math.floor(59 + normalized * 5 * 100)}, ${Math.floor(130 + normalized * 5 * 50)}, ${Math.floor(246)})`;
    } else if (normalized < 0.4) {
      // Cold: Cyan to Green
      const t = (normalized - 0.2) / 0.2;
      return `rgb(${Math.floor(34 * (1 - t) + 34 * t)}, ${Math.floor(197 * (1 - t) + 197 * t)}, ${Math.floor(94 * (1 - t) + 94 * t)})`;
    } else if (normalized < 0.6) {
      // Moderate: Green to Yellow
      const t = (normalized - 0.4) / 0.2;
      return `rgb(${Math.floor(34 + t * 220)}, ${Math.floor(197 - t * 17)}, ${Math.floor(94 - t * 60)})`;
    } else if (normalized < 0.8) {
      // Warm: Yellow to Orange
      const t = (normalized - 0.6) / 0.2;
      return `rgb(${Math.floor(251 - t * 2)}, ${Math.floor(191 - t * 47)}, ${Math.floor(36)})`;
    } else {
      // Hot: Orange to Red
      const t = (normalized - 0.8) / 0.2;
      return `rgb(${Math.floor(239 - t * 24)}, ${Math.floor(68 - t * 24)}, ${Math.floor(68 - t * 24)})`;
    }
  };

  // Create custom icon for searched location
  const createSearchIcon = () => {
    return L.divIcon({
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-search-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-[1000] bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Loading map data...</p>
        </div>
      )}
      
      <MapContainer
        center={[30, 0]}
        zoom={2}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onClick={onLocationClick} />
        <MapBoundsUpdater location={highlightLocation} />

        {/* Render grid points with temperature colors */}
        {gridPoints.map((point) => {
          const isSelected = point.gridIndex === selectedGridIndex;
          return (
            <CircleMarker
              key={point.gridIndex}
              center={[point.lat, point.lon]}
              radius={isSelected ? 8 : 3}
              fillColor={isSelected ? '#22c55e' : getColorForTemp(point.temperature)}
              color={isSelected ? '#fff' : 'transparent'}
              weight={isSelected ? 2 : 0}
              fillOpacity={isSelected ? 1 : 0.6}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold">Grid {point.gridIndex}</div>
                  <div>Temperature: {point.temperature.toFixed(1)}°C</div>
                  <div className="text-xs text-gray-500">
                    {point.lat.toFixed(2)}°, {point.lon.toFixed(2)}°
                  </div>
                  {isSelected && (
                    <div className="text-xs text-green-600 font-medium mt-1">
                      Currently selected
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Show marker for the searched city location */}
        {highlightLocation && highlightLocation.lat && highlightLocation.lon && (
          <Marker
            position={[highlightLocation.lat, highlightLocation.lon]}
            icon={createSearchIcon()}
          >
            <Popup>
              <div className="text-sm">
                <strong>Searched Location</strong>
                <br />
                {highlightLocation.lat.toFixed(4)}°, {highlightLocation.lon.toFixed(4)}°
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Temperature Legend */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-2">Temperature Scale</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tempRange.min.toFixed(0)}°C</span>
          <div className="flex-1 h-4 rounded-full" style={{
            background: `linear-gradient(to right, 
              rgb(59, 130, 246), 
              rgb(34, 197, 94), 
              rgb(234, 179, 8), 
              rgb(249, 115, 22), 
              rgb(239, 68, 68))`
          }} />
          <span className="text-xs text-muted-foreground">{tempRange.max.toFixed(0)}°C</span>
        </div>
      </div>
    </div>
  );
}


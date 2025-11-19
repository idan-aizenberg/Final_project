"use client";

import { useEffect, useState } from "react";
import type { LatLngExpression } from "leaflet";

const DEFAULT_CENTER: LatLngExpression = [32.0853, 34.7818];

interface GeoMapProps {
  position?: LatLngExpression;
  onPositionChange?: (position: LatLngExpression) => void;
}

export function GeoMap({ position = DEFAULT_CENTER, onPositionChange }: GeoMapProps) {
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;

    // Dynamically import leaflet only on client
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const markerIcon2x = require("leaflet/dist/images/marker-icon-2x.png");
    const markerIcon = require("leaflet/dist/images/marker-icon.png");
    const markerShadow = require("leaflet/dist/images/marker-shadow.png");

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.default?.src || markerIcon2x,
      iconUrl: markerIcon.default?.src || markerIcon,
      shadowUrl: markerShadow.default?.src || markerShadow,
    });

    const container = document.getElementById("geo-map-container");
    if (!container) return;

    const map = L.map("geo-map-container").setView(position, 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.marker(position).addTo(map);

    const handleClick = (e: any) => {
      onPositionChange?.([e.latlng.lat, e.latlng.lng]);
    };

    map.on("click", handleClick);

    setMapInstance(map);

    return () => {
      map.off("click", handleClick);
      map.remove();
    };
  }, [isClient, onPositionChange]);

  useEffect(() => {
    if (mapInstance && isClient) {
      mapInstance.setView(position, 8);
      mapInstance.eachLayer((layer: any) => {
        if (layer instanceof (require("leaflet") as any).Marker) {
          mapInstance.removeLayer(layer);
        }
      });
      const L = require("leaflet");
      L.marker(position).addTo(mapInstance);
    }
  }, [position, mapInstance, isClient]);

  if (!isClient) {
    return <div className="h-64 w-full rounded-2xl border border-border/60 bg-muted/30" />;
  }

  return (
    <div
      id="geo-map-container"
      className="h-64 w-full rounded-2xl border border-border/60"
      style={{ minHeight: "256px", minWidth: "100%" }}
    />
  );
}

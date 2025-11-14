"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect } from "react";

const DEFAULT_CENTER: LatLngExpression = [32.0853, 34.7818];

if (typeof window !== "undefined") {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x.src,
    iconUrl: markerIcon.src,
    shadowUrl: markerShadow.src,
  });
}

interface GeoMapProps {
  position?: LatLngExpression;
  onPositionChange?: (position: LatLngExpression) => void;
}

function LocationMarker({ onChange }: { onChange?: (position: LatLngExpression) => void }) {
  useMapEvents({
    click(event) {
      onChange?.([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export function GeoMap({ position = DEFAULT_CENTER, onPositionChange }: GeoMapProps) {
  useEffect(() => {
    // Ensure the map renders correctly after hydration
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resize"));
    }
  }, [position]);

  return (
    <MapContainer
      center={position}
      zoom={6}
      className="h-64 w-full rounded-2xl border border-border/60"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
      <LocationMarker onChange={onPositionChange} />
    </MapContainer>
  );
}

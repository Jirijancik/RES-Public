"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPinIcon } from "lucide-react";
import type { AresHeadquarters } from "@/lib/ares";
import { Spinner } from "@/components/ui/spinner";

import "leaflet/dist/leaflet.css";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

function buildGeocodeQuery(hq: AresHeadquarters): string {
  const parts: string[] = [];
  if (hq.streetName) {
    let street = hq.streetName;
    if (hq.buildingNumber) street += ` ${hq.buildingNumber}`;
    parts.push(street);
  }
  if (hq.municipalityName) parts.push(hq.municipalityName);
  if (hq.postalCode) parts.push(String(hq.postalCode));
  parts.push("Czech Republic");
  return parts.join(", ");
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: "cz",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "RES-CzechBusinessRegistry/1.0",
    },
  });

  const results: NominatimResult[] = await response.json();
  if (results.length === 0) return null;

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };
}

function useGeocode(headquarters: AresHeadquarters) {
  const query = buildGeocodeQuery(headquarters);
  return useQuery({
    queryKey: ["geocode", query],
    queryFn: () => geocodeAddress(query),
    staleTime: Infinity,
    retry: 1,
  });
}

interface SubjectMapProps {
  headquarters: AresHeadquarters;
}

export function SubjectMap({ headquarters }: SubjectMapProps) {
  const { t } = useTranslation("forms");
  const { data: coords, isLoading, isError } = useGeocode(headquarters);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!coords || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    // Import leaflet dynamically to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
      }).setView([coords.lat, coords.lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng]).addTo(map);
      if (headquarters.textAddress || headquarters.municipalityName) {
        marker.bindPopup(headquarters.textAddress || headquarters.municipalityName || "");
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords, headquarters]);

  if (isLoading) {
    return (
      <div className="bg-muted flex h-[250px] items-center justify-center rounded-lg">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (isError || !coords) {
    return (
      <div className="bg-muted text-muted-foreground flex h-[150px] flex-col items-center justify-center gap-2 rounded-lg text-sm">
        <MapPinIcon className="size-5 opacity-50" />
        <span>{t("ares.detail.mapUnavailable")}</span>
      </div>
    );
  }

  return <div ref={mapRef} className="z-0 h-[250px] overflow-hidden rounded-lg" />;
}

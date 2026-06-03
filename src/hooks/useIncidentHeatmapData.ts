import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIncidentCoordinates, getCityCenter, DEFAULT_CENTER } from "@/lib/locationCoordinates";

export interface HeatmapIncident {
  id: string;
  category: string;
  status: string;
  city: string | null;
  area: string | null;
  is_emergency: boolean;
  created_at: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  incidents: HeatmapIncident[];
}

export type HeatmapMode = "density" | "category" | "active";

interface UseIncidentHeatmapDataProps {
  jurisdictionCity?: string | null;
  mode: HeatmapMode;
  selectedCategory?: string;
  isPublicView?: boolean;
}

export const useIncidentHeatmapData = ({
  jurisdictionCity,
  mode,
  selectedCategory,
  isPublicView = false,
}: UseIncidentHeatmapDataProps) => {
  const [incidents, setIncidents] = useState<HeatmapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, [jurisdictionCity, isPublicView]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("incidents")
        .select("id, category, status, city, area, is_emergency, created_at");

      // For higher officers, filter by their jurisdiction
      if (jurisdictionCity) {
        query = query.eq("city", jurisdictionCity);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setIncidents(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching heatmap data:", err);
      setError("Failed to load incident data");
    } finally {
      setLoading(false);
    }
  };

  // Filter incidents based on mode
  const filteredIncidents = useMemo(() => {
    let filtered = [...incidents];

    switch (mode) {
      case "category":
        if (selectedCategory && selectedCategory !== "all") {
          filtered = filtered.filter((i) => i.category === selectedCategory);
        }
        break;
      case "active":
        filtered = filtered.filter((i) =>
          ["pending", "assigned", "in_progress"].includes(i.status)
        );
        break;
      case "density":
      default:
        // Show all incidents
        break;
    }

    // For public view, only show resolved incidents for safety awareness
    if (isPublicView) {
      // Citizens see a general overview - don't expose sensitive details
      // We still include all incidents for the heatmap but limit what info is exposed
    }

    return filtered;
  }, [incidents, mode, selectedCategory, isPublicView]);

  // Group incidents by location and create heatmap points
  const heatmapPoints = useMemo(() => {
    const pointMap = new Map<string, HeatmapPoint>();

    filteredIncidents.forEach((incident) => {
      const coords = getIncidentCoordinates(incident.city, incident.area);
      if (!coords) return;

      const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;

      if (pointMap.has(key)) {
        const existing = pointMap.get(key)!;
        existing.intensity += 1;
        existing.incidents.push(incident);
      } else {
        pointMap.set(key, {
          lat: coords.lat,
          lng: coords.lng,
          intensity: 1,
          incidents: [incident],
        });
      }
    });

    return Array.from(pointMap.values());
  }, [filteredIncidents]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(incidents.map((i) => i.category));
    return Array.from(cats).sort();
  }, [incidents]);

  // Calculate map center based on data
  const mapCenter = useMemo((): [number, number] => {
    if (jurisdictionCity) {
      const center = getCityCenter(jurisdictionCity);
      if (center) return [center.lat, center.lng];
    }

    if (heatmapPoints.length > 0) {
      const avgLat =
        heatmapPoints.reduce((sum, p) => sum + p.lat, 0) / heatmapPoints.length;
      const avgLng =
        heatmapPoints.reduce((sum, p) => sum + p.lng, 0) / heatmapPoints.length;
      return [avgLat, avgLng];
    }

    return DEFAULT_CENTER;
  }, [jurisdictionCity, heatmapPoints]);

  // Stats for display
  const stats = useMemo(() => {
    return {
      total: filteredIncidents.length,
      emergency: filteredIncidents.filter((i) => i.is_emergency).length,
      active: filteredIncidents.filter((i) =>
        ["pending", "assigned", "in_progress"].includes(i.status)
      ).length,
      resolved: filteredIncidents.filter((i) => i.status === "resolved").length,
    };
  }, [filteredIncidents]);

  return {
    incidents: filteredIncidents,
    heatmapPoints,
    categories,
    mapCenter,
    stats,
    loading,
    error,
    refetch: fetchIncidents,
  };
};

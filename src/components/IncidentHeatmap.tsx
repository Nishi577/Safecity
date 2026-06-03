import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import {
  useIncidentHeatmapData,
  HeatmapMode,
  HeatmapPoint,
} from "@/hooks/useIncidentHeatmapData";

// Extend L namespace for heat layer
declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: any
  ): any;
}

interface HeatLayerProps {
  points: HeatmapPoint[];
  mode: HeatmapMode;
}

const HeatLayer = ({ points, mode }: HeatLayerProps) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (points.length === 0) return;

    // Convert points to heatmap format [lat, lng, intensity]
    const heatData: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      Math.min(p.intensity * 0.3, 1), // Normalize intensity
    ]);

    // Color gradient based on mode
    const gradient: Record<number, string> = {
      0.0: "#22c55e", // green
      0.25: "#84cc16", // lime
      0.5: "#eab308", // yellow
      0.75: "#f97316", // orange
      1.0: "#ef4444", // red
    };

    heatLayerRef.current = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient,
      minOpacity: 0.4,
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points, mode]);

  return null;
};

interface MapCenterUpdaterProps {
  center: [number, number];
}

const MapCenterUpdater = ({ center }: MapCenterUpdaterProps) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);

  return null;
};

interface IncidentHeatmapProps {
  jurisdictionCity?: string | null;
  isPublicView?: boolean;
  className?: string;
}

const IncidentHeatmap = ({
  jurisdictionCity,
  isPublicView = false,
  className = "",
}: IncidentHeatmapProps) => {
  const [mode, setMode] = useState<HeatmapMode>("density");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const {
    heatmapPoints,
    categories,
    mapCenter,
    stats,
    loading,
    error,
    refetch,
  } = useIncidentHeatmapData({
    jurisdictionCity,
    mode,
    selectedCategory,
    isPublicView,
  });

  const getModeLabel = (m: HeatmapMode) => {
    switch (m) {
      case "density":
        return "Incident Density";
      case "category":
        return "By Category";
      case "active":
        return "Active/Unresolved";
      default:
        return m;
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Header with filters */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">
              {isPublicView ? "Safety Awareness Map" : "Incident Heatmap"}
            </h3>
            {jurisdictionCity && (
              <Badge variant="outline" className="ml-2">
                {jurisdictionCity}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as HeatmapMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="density">Incident Density</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="active">Active/Unresolved</SelectItem>
              </SelectContent>
            </Select>

            {mode === "category" && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          {!isPublicView && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Emergency:</span>
                <span className="font-medium text-destructive">{stats.emergency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">Active:</span>
                <span className="font-medium text-warning">{stats.active}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-muted-foreground">Resolved:</span>
            <span className="font-medium text-success">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[400px] relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </div>
        ) : loading && heatmapPoints.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={jurisdictionCity ? 11 : 5}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer points={heatmapPoints} mode={mode} />
            <MapCenterUpdater center={mapCenter} />
          </MapContainer>
        )}

        {heatmapPoints.length === 0 && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 pointer-events-none">
            <p className="text-muted-foreground">No incidents to display</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Intensity:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded bg-success" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded bg-warning" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded bg-destructive" />
              <span>High</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Mode: {getModeLabel(mode)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IncidentHeatmap;

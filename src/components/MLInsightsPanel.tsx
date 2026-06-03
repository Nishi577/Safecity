import { useState, useCallback } from "react";
import {
  TrendingUp, AlertTriangle, MapPin, Clock, Lightbulb,
  RefreshCw, Flame, Shield, BrainCircuit, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeHotspots,
  computePriorityQueue,
  generatePredictiveAlerts,
  getTrendAnalysis,
  getOfficerRecommendations,
} from "@/lib/mlService";
import { SeverityBadge } from "@/components/DescriptionAnalyzer";

interface MLInsights {
  totalIncidents: number;
  totalSOS: number;
  topCategories: { category: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  hotspots: { location: string; risk_level: string; reason: string }[];
  patterns: { type: string; description: string }[];
  recommendations: { priority: string; action: string }[];
  trends: { direction: string; category: string; note: string }[];
}

interface MLEnhanced {
  priorityQueue: any[];
  predictiveAlerts: any[];
  mlHotspots: any[];
  mlRecommendations: any[];
  mlTrends: any;
}

const MLInsightsPanel = () => {
  const [insights, setInsights] = useState<MLInsights | null>(null);
  const [enhanced, setEnhanced] = useState<MLEnhanced | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-patterns");
      if (error) throw error;
      setInsights(data);

      const { data: incidents } = await supabase
        .from("incidents")
        .select("id, description, city, area, urgency, status, category, created_at, incident_date, incident_time")
        .order("created_at", { ascending: false })
        .limit(200);

      const incList = incidents || [];

      const [pqResult, alertsResult, hotspotsResult, trendsResult, recsResult] = await Promise.allSettled([
        computePriorityQueue(incList),
        generatePredictiveAlerts(incList),
        computeHotspots(incList),
        getTrendAnalysis(incList),
        getOfficerRecommendations(incList),
      ]);

      setEnhanced({
        priorityQueue: pqResult.status === "fulfilled" ? (pqResult.value as any).top_urgent || [] : [],
        predictiveAlerts: alertsResult.status === "fulfilled" ? (alertsResult.value as any).alerts || [] : [],
        mlHotspots: hotspotsResult.status === "fulfilled" ? (hotspotsResult.value as any).hotspots || [] : [],
        mlTrends: trendsResult.status === "fulfilled" ? trendsResult.value : null,
        mlRecommendations: recsResult.status === "fulfilled" ? (recsResult.value as any).recommendations || [] : [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  const riskColors: Record<string, string> = {
    HIGH: "text-destructive bg-destructive/10",
    MEDIUM: "text-yellow-700 bg-yellow-100",
    LOW: "text-green-700 bg-green-100",
    high: "text-destructive bg-destructive/10",
    medium: "text-yellow-700 bg-yellow-100",
    low: "text-green-700 bg-green-100",
  };

  const priorityColors: Record<string, string> = {
    high: "text-destructive",
    medium: "text-yellow-600",
    low: "text-muted-foreground",
  };

  const urgencyColor = (u: string) => {
    const val = (u || "").toLowerCase();
    if (val === "critical" || val === "high") return "bg-red-100 text-red-800 border-red-300";
    if (val === "medium") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  if (!insights) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-accent opacity-50" />
        <h3 className="font-semibold mb-2">ML Intelligence Engine</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Run full ML analysis: hotspot detection, priority queue, predictive alerts, trend analysis and officer recommendations.
        </p>
        <Button variant="hero" onClick={fetchInsights} disabled={loading}>
          {loading ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
          ) : (
            <><BrainCircuit className="h-4 w-4 mr-2" />Run ML Analysis</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-accent" /> ML Insights
        </h3>
        <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Incidents</p>
          <p className="text-xl font-bold">{insights.totalIncidents}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">SOS Reports</p>
          <p className="text-xl font-bold text-destructive">{insights.totalSOS}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Top Category</p>
          <p className="text-sm font-bold truncate">{insights.topCategories?.[0]?.category || "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Peak Hour</p>
          <p className="text-xl font-bold">{insights.peakHours?.[0] ? `${insights.peakHours[0].hour}:00` : "—"}</p>
        </div>
      </div>

      {/* 🔥 Urgent Cases — Priority Queue */}
      {enhanced?.priorityQueue && enhanced.priorityQueue.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h4 className="font-semibold flex items-center gap-2 mb-3 text-destructive">
            <Flame className="h-4 w-4" /> 🔥 Urgent Cases
          </h4>
          <div className="space-y-2">
            {enhanced.priorityQueue.slice(0, 5).map((inc: any, i: number) => (
              <div key={inc.id || i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inc.description?.slice(0, 80) || "No description"}</p>
                  <p className="text-xs text-muted-foreground">{inc.city || "Unknown"}{inc.area ? ` — ${inc.area}` : ""}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    {inc.ml_severity ? (
                      <SeverityBadge severity={inc.ml_severity} size="sm" />
                    ) : (
                      <Badge variant="outline" className={`text-[10px] ${urgencyColor(inc.urgency || "")}`}>
                        {(inc.urgency || "low").toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    score: {
                      (inc.computed_priority_score !== undefined && inc.computed_priority_score !== null)
                        ? Number(inc.computed_priority_score).toFixed(1)
                        : (inc.priority_score !== undefined && inc.priority_score !== null)
                          ? Number(inc.priority_score).toFixed(1)
                          : "0.0"
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔮 Predictive Alerts */}
      {enhanced?.predictiveAlerts && enhanced.predictiveAlerts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-accent" />
            🔮 Predictive Alerts
          </h4>
          <div className="space-y-2">
            {enhanced.predictiveAlerts.map((alert: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ High Risk Areas */}
      {enhanced?.mlHotspots && enhanced.mlHotspots.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-destructive" />
            ⚠️ High Risk Areas
          </h4>
          <div className="space-y-2">
            {enhanced.mlHotspots.map((h: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{h.location}</p>
                  <p className="text-xs text-muted-foreground">{h.reason}</p>
                </div>
                <Badge variant="outline" className={riskColors[h.risk_level] || ""}>
                  {h.risk_level}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supabase Hotspots */}
      {insights.hotspots?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-destructive" />
            Detected Hotspots
          </h4>
          <div className="space-y-2">
            {insights.hotspots.map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{h.location}</p>
                  <p className="text-xs text-muted-foreground">{h.reason}</p>
                </div>
                <Badge variant="outline" className={riskColors[h.risk_level] || ""}>
                  {h.risk_level}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      {enhanced?.mlTrends && enhanced.mlTrends.categories?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4 text-accent" />
            Trend Analysis
          </h4>
          <div className="space-y-2">
            {enhanced.mlTrends.categories.slice(0, 5).map((cat: any, i: number) => {
              const maxCount = enhanced.mlTrends.categories[0]?.count || 1;
              const pct = Math.round((cat.count / maxCount) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{cat.category}</span>
                    <span className="text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {(() => {
            const peak = [...(enhanced.mlTrends.hourly || [])].sort((a: any, b: any) => b.count - a.count)[0];
            return peak?.count > 0 ? (
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                <Clock className="h-3 w-3 inline mr-1" />
                Peak activity at {peak.hour}:00 ({peak.count} incidents)
              </p>
            ) : null;
          })()}
        </div>
      )}

      {/* Detected Patterns */}
      {insights.patterns?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-accent" />
            Detected Patterns
          </h4>
          <div className="space-y-2">
            {insights.patterns.map((p, i) => (
              <div key={i} className="p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className="mb-1 text-[10px]">{p.type}</Badge>
                <p className="text-sm">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💡 Recommendations */}
      {(enhanced?.mlRecommendations?.length > 0 || insights.recommendations?.length > 0) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            💡 Recommendations
          </h4>
          <div className="space-y-2">
            {(enhanced?.mlRecommendations?.length ? enhanced.mlRecommendations : insights.recommendations).map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Shield className={`h-4 w-4 mt-0.5 shrink-0 ${priorityColors[r.priority] || ""}`} />
                <p className="text-sm">{r.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {insights.trends?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-accent" />
            Trends
          </h4>
          <div className="space-y-2">
            {insights.trends.map((t, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className={
                  t.direction === "increasing" ? "text-destructive" : t.direction === "decreasing" ? "text-green-600" : ""
                }>
                  {t.direction} ↕
                </Badge>
                <span className="text-sm font-medium">{t.category}</span>
                <span className="text-xs text-muted-foreground">— {t.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MLInsightsPanel;

import { useState, useEffect } from "react";
import { AlertTriangle, Shield, Info, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  level: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  area: string;
  created_at: string;
  type: string;
  severity: string;
}

const levelStyles: Record<string, any> = {
  critical: {
    bg: "bg-red-500/10 border-red-500/30",
    badge: "bg-red-500/20 text-red-700",
    icon: AlertTriangle,
  },
  high: {
    bg: "bg-destructive/10 border-destructive/30",
    badge: "bg-destructive/20 text-destructive",
    icon: AlertTriangle,
  },
  medium: {
    bg: "bg-warning/10 border-warning/30",
    badge: "bg-warning/20 text-warning",
    icon: Info,
  },
  low: {
    bg: "bg-accent/10 border-accent/30",
    badge: "bg-accent/20 text-accent",
    icon: Shield,
  },
};

const SafetyAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase.channel('public-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        setAlerts(prev => [payload.new as Alert, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts((data as any) || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Safety Alerts</h2>
          <p className="text-sm text-muted-foreground">Recent alerts and advisories for your area</p>
        </div>
        <Badge variant="outline" className="text-accent">
          {alerts.length} Active
        </Badge>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">No active safety alerts for your location.</div>
        ) : alerts.map((alert) => {
          const level = (alert.severity || 'low').toLowerCase();
          const style = levelStyles[level] || levelStyles.low;
          const Icon = style.icon;
          return (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 transition-all hover:shadow-md ${style.bg}`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{alert.title}</h3>
                    <Badge className={style.badge} variant="outline">
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {alert.area || "City-wide"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(alert.created_at))} ago
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SafetyAlerts;

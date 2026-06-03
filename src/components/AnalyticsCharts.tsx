import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Incident {
  id: string;
  category: string;
  status: string;
  urgency: string;
  created_at: string;
  city: string | null;
  area: string | null;
  is_emergency: boolean;
}

interface AnalyticsChartsProps {
  incidents: Incident[];
}

const CHART_COLORS = [
  "hsl(185, 60%, 40%)",   // accent/teal
  "hsl(215, 50%, 18%)",   // primary/navy
  "hsl(38, 92%, 50%)",    // warning/amber
  "hsl(160, 60%, 40%)",   // success/green
  "hsl(0, 72%, 51%)",     // destructive/red
  "hsl(270, 50%, 50%)",   // purple
  "hsl(200, 60%, 50%)",   // blue
  "hsl(30, 80%, 55%)",    // orange
];

const AnalyticsCharts = ({ incidents }: AnalyticsChartsProps) => {
  // Incident trends over time (last 30 days)
  const trendData = useMemo(() => {
    const days = 30;
    const now = new Date();
    const counts: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      counts[key] = 0;
    }
    incidents.forEach((inc) => {
      const key = inc.created_at.split("T")[0];
      if (key in counts) counts[key]++;
    });
    return Object.entries(counts).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      incidents: count,
    }));
  }, [incidents]);

  // Category distribution
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach((inc) => {
      const cat = inc.category.replace(/_/g, " ");
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  // Area-wise counts
  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach((inc) => {
      const area = inc.area || inc.city || "Unknown";
      map[area] = (map[area] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [incidents]);

  // Status summary
  const statusData = useMemo(() => {
    const map: Record<string, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
    };
    incidents.forEach((inc) => {
      if (inc.status in map) map[inc.status]++;
      else map[inc.status] = (map[inc.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));
  }, [incidents]);

  const STATUS_COLORS: Record<string, string> = {
    pending: "hsl(38, 92%, 50%)",
    assigned: "hsl(200, 60%, 50%)",
    "in progress": "hsl(185, 60%, 40%)",
    resolved: "hsl(160, 60%, 40%)",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Incident Trends */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Incident Trends</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 20%, 88%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="incidents"
                stroke="hsl(185, 60%, 40%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(185, 60%, 40%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Summary (Pie) */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Status Summary</h3>
        <p className="text-xs text-muted-foreground mb-4">Overall incident status distribution</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name} (${value})`}
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || "hsl(215, 20%, 65%)"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Distribution (Bar) */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Incident Types</h3>
        <p className="text-xs text-muted-foreground mb-4">Distribution by category</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 20%, 88%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill="hsl(185, 60%, 40%)" radius={[0, 4, 4, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area/Zone-wise (Bar) */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-1">Top Areas</h3>
        <p className="text-xs text-muted-foreground mb-4">Zone-wise incident count</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 20%, 88%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill="hsl(215, 50%, 18%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;

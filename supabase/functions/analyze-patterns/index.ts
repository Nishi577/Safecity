import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch recent incidents (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: incidents, error } = await supabase
      .from("incidents")
      .select("category, city, area, urgency, status, is_emergency, created_at, incident_date, incident_time")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Also fetch SOS reports
    const { data: sosReports } = await supabase
      .from("sos_reports")
      .select("emergency_type, city, area, created_at")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .limit(200);

    // Build summary stats for the AI
    const categoryCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    (incidents || []).forEach((inc) => {
      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
      
      const loc = `${inc.city || "unknown"}-${inc.area || "unknown"}`;
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      
      const hour = new Date(inc.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      
      const day = new Date(inc.created_at).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    if (!apiKey) {
      // Return basic stats without AI analysis
      return new Response(JSON.stringify({
        totalIncidents: (incidents || []).length,
        totalSOS: (sosReports || []).length,
        hotspots: Object.entries(locationCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([loc, count]) => ({ location: loc, count })),
        topCategories: Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([cat, count]) => ({ category: cat, count })),
        peakHours: Object.entries(hourCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([hour, count]) => ({ hour: parseInt(hour), count })),
        insights: [],
        recommendations: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary = `
Incident Data Summary (last 90 days):
Total incidents: ${(incidents || []).length}
Total SOS reports: ${(sosReports || []).length}

Categories: ${JSON.stringify(categoryCounts)}
Locations: ${JSON.stringify(locationCounts)}
Hour distribution: ${JSON.stringify(hourCounts)}
Day distribution (0=Sun): ${JSON.stringify(dayCounts)}
Emergency incidents: ${(incidents || []).filter(i => i.is_emergency).length}
Unresolved: ${(incidents || []).filter(i => i.status !== 'resolved').length}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a public safety analyst. Analyze incident data and provide actionable insights.
Respond ONLY with valid JSON:
{
  "hotspots": [{"location": "city-area", "risk_level": "high|medium|low", "reason": "brief"}],
  "patterns": [{"type": "temporal|spatial|categorical", "description": "brief pattern"}],
  "recommendations": [{"priority": "high|medium|low", "action": "specific recommendation"}],
  "trends": [{"direction": "increasing|decreasing|stable", "category": "category name", "note": "brief"}]
}
Keep arrays to max 5 items each. Be concise.`
          },
          { role: "user", content: summary }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let aiInsights = { hotspots: [], patterns: [], recommendations: [], trends: [] };
    if (jsonMatch) {
      try { aiInsights = JSON.parse(jsonMatch[0]); } catch {}
    }

    return new Response(JSON.stringify({
      totalIncidents: (incidents || []).length,
      totalSOS: (sosReports || []).length,
      topCategories: Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, count]) => ({ category: cat, count })),
      peakHours: Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), count })),
      ...aiInsights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Analysis failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

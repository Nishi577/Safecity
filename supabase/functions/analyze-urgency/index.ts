import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, category } = await req.json();

    if (!description) {
      return new Response(JSON.stringify({ error: "Description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ urgency: "medium", confidence: 0.5, reason: "AI unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are a public safety urgency classifier. Analyze incident descriptions and classify urgency.
Respond ONLY with valid JSON: {"urgency": "low"|"medium"|"high"|"critical", "confidence": 0.0-1.0, "reason": "brief explanation"}

Guidelines:
- CRITICAL: Life-threatening, active violence, kidnapping, armed situations, fires with people trapped
- HIGH: Physical assault, robbery in progress, serious accidents, missing children
- MEDIUM: Property crime, harassment, suspicious activity, vandalism
- LOW: Noise complaints, minor disputes, parking issues, general concerns`
          },
          {
            role: "user",
            content: `Category: ${category || "unknown"}\nDescription: ${description}`
          }
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ urgency: "medium", confidence: 0.5, reason: "Could not parse AI response" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ urgency: "medium", confidence: 0.5, reason: "Analysis error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * CityWatch ML Service Client
 * Handles all ML API calls with graceful fallback.
 */

const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8000";

const SEVERITY_KEYWORDS = {
  CRITICAL: [
    // Violence & death
    "murder", "killed", "kill", "dead body", "corpse", "homicide", "manslaughter",
    "genocide", "mass murder", "mass shooting", "serial killer",
    // Weapons of mass destruction
    "bomb", "bombing", "explosion", "blast", "explosive", "grenade", "ied",
    "chemical attack", "bioterror", "nuclear", "toxic gas",
    // Terrorism
    "terrorist", "terrorism", "terror attack", "suicide bomber", "jihad",
    "extremist attack", "militant", "insurgent",
    // Kidnapping & hostage
    "hostage", "kidnap", "kidnapping", "abducted", "abduction", "held captive",
    "ransom", "missing child", "child abduction",
    // Sexual violence
    "rape", "gang rape", "sexual assault", "molest", "molestation",
    "child abuse", "child sexual", "pedophile",
    // Armed & life threatening
    "shot dead", "stabbed to death", "beheaded", "lynched", "burned alive",
    "acid attack", "honour killing", "dowry death",
  ],

  HIGH: [
    // Physical assault
    "assault", "attacked", "beaten", "beat up", "punched", "kicked",
    "physical attack", "bodily harm", "grievous hurt", "serious injury",
    "hit with", "bludgeoned", "strangled", "choked",
    // Armed threat
    "gun", "gunpoint", "firearm", "pistol", "revolver", "rifle", "shotgun",
    "knife", "sharp weapon", "sword", "machete", "blade", "armed",
    "weapon", "threatening with", "brandishing",
    // Robbery & dacoity
    "robbery", "armed robbery", "dacoity", "dacoit", "looting", "mugging",
    "snatching", "chain snatching", "carjacking", "hijack",
    // Fire & arson
    "fire", "arson", "set on fire", "burning building", "building on fire",
    "shop on fire", "house fire", "fire outbreak",
    // Riots & mob
    "riot", "mob attack", "mob violence", "communal violence", "lynching",
    "stone pelting", "violent protest", "clashes",
    // Shooting & stabbing
    "shooting", "stabbing", "stabbed", "shot", "bullet", "gunshot",
    "knife attack", "stab wound",
    // Domestic & gender violence
    "domestic violence", "wife beating", "husband beating", "dowry harassment",
    "eve teasing", "molestation attempt",
    // Other high severity
    "hit and run", "road rage", "drunk driving accident", "serious accident",
    "suicide attempt", "self harm", "overdose",
    "extortion", "blackmail", "threatening", "death threat",
  ],

  MEDIUM: [
    // Theft & property crime
    "theft", "stolen", "steal", "stole", "pickpocket", "shoplifting",
    "burglary", "break-in", "broke into", "house break", "vehicle theft",
    "bike theft", "car theft", "mobile theft", "wallet stolen",
    // Fraud & cybercrime
    "fraud", "scam", "cheating", "swindled", "conned", "fake",
    "cyber fraud", "online fraud", "upi fraud", "atm fraud", "phishing",
    "identity theft", "impersonation", "forgery",
    // Harassment
    "harassment", "stalking", "stalker", "following me", "being followed",
    "sexual harassment", "workplace harassment", "cyber bullying",
    "trolling", "threatening messages", "obscene calls",
    // Drugs & substances
    "drug", "drugs", "narcotics", "cocaine", "heroin", "ganja", "weed",
    "marijuana", "intoxicated", "drunk", "substance abuse",
    // Vandalism & property damage
    "vandalism", "damaged", "destroyed property", "broken windows",
    "graffiti", "slashed tyres", "scratched car",
    // Accidents
    "accident", "collision", "crashed", "vehicle accident", "bike accident",
    "road accident", "injured in accident",
    // Missing persons
    "missing person", "missing", "disappeared", "not returned home",
    "person missing", "runaway",
    // Trespassing & encroachment
    "trespassing", "trespasser", "encroachment", "illegal entry",
    "breaking into", "unauthorised entry",
    // Domestic disputes
    "domestic dispute", "family dispute", "neighbour dispute",
    "land dispute", "property dispute",
  ],

  LOW: [
    // Noise & nuisance
    "noise", "loud noise", "loud music", "loud party", "nuisance",
    "disturbing peace", "neighbourhood noise", "late night noise",
    // Minor disturbances
    "disturbance", "argument", "quarrel", "verbal fight", "shouting",
    "abusive language", "verbal abuse", "fighting words",
    // Traffic & parking
    "parking", "wrong parking", "traffic jam", "traffic issue",
    "signal violation", "no parking", "blocked road", "pothole",
    // Animal related
    "stray dog", "stray animal", "dog bite", "animal nuisance",
    "cow on road", "snake spotted",
    // Sanitation & civic
    "garbage", "waste", "littering", "open defecation", "dirty road",
    "overflowing drain", "waterlogging", "street light",
    // Minor complaints
    "minor", "complaint", "issue", "problem", "concern",
    "suspicious activity", "suspicious person", "unfamiliar person",
    "beggars", "hawkers", "encroachment on footpath",
    // Infrastructure
    "broken road", "broken footpath", "damaged infrastructure",
    "power cut", "no electricity", "water supply issue",
  ],
};

function ruleBasedSeverity(description: string): string {
  const desc = description.toLowerCase();
  // Check in priority order: CRITICAL → HIGH → MEDIUM → LOW
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  for (const level of order) {
    const keywords = SEVERITY_KEYWORDS[level];
    if (keywords.some((kw) => desc.includes(kw))) return level;
  }
  return "LOW";
}

async function callML<T>(endpoint: string, body: object, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

// ─── Severity Prediction ─────────────────────────────────────────

export async function predictSeverity(
  description: string
): Promise<{ severity: string; confidence: number; fallback: boolean }> {
  const result = await callML<null>("/predict", { description }, null);
  if (result) {
    return { ...(result as any), fallback: false };
  }
  return { severity: ruleBasedSeverity(description), confidence: 0.5, fallback: true };
}

// ─── Fake Report Detection ───────────────────────────────────────

export async function detectFakeReport(
  description: string
): Promise<{ is_suspicious: boolean; reason: string }> {
  // Try ML server first; fall back to local rule-based engine
  const serverResult = await callML<null>("/fake-detect", { description }, null);
  if (serverResult) return serverResult as { is_suspicious: boolean; reason: string };

  // Local fallback: use the descriptionAnalyzer quality engine
  const { analyzeDescriptionQuality } = await import("./descriptionAnalyzer");
  const quality = analyzeDescriptionQuality(description);
  return {
    is_suspicious: quality.isSuspicious,
    reason: quality.issues.join("; ") || "Description quality too low",
  };
}

// ─── Incident Similarity ─────────────────────────────────────────

export async function findSimilarIncidents(
  description: string
): Promise<{ similar_count: number; message: string; similar_cases: any[] }> {
  return callML("/similarity", { description }, {
    similar_count: 0,
    message: "Similarity check unavailable",
    similar_cases: [],
  });
}

// ─── Hotspot Intelligence ────────────────────────────────────────

export async function computeHotspots(
  incidents: any[]
): Promise<{ hotspots: any[] }> {
  return callML("/hotspots", { incidents }, { hotspots: [] });
}

// ─── Priority Queue ──────────────────────────────────────────────

export async function computePriorityQueue(
  incidents: any[]
): Promise<{ incidents: any[]; top_urgent: any[] }> {
  return callML("/priority-queue", { incidents }, { incidents, top_urgent: incidents.slice(0, 5) });
}

// ─── Predictive Alerts ───────────────────────────────────────────

export async function generatePredictiveAlerts(
  incidents: any[]
): Promise<{ alerts: any[] }> {
  return callML("/predictive-alerts", { incidents }, { alerts: [] });
}

// ─── Trend Analysis ──────────────────────────────────────────────

export async function getTrendAnalysis(
  incidents: any[]
): Promise<{ trends: any[]; hourly: any[]; categories: any[]; monthly: any[] }> {
  return callML("/trend-analysis", { incidents }, { trends: [], hourly: [], categories: [], monthly: [] });
}

// ─── Officer Recommendations ─────────────────────────────────────

export async function getOfficerRecommendations(
  incidents: any[]
): Promise<{ recommendations: any[] }> {
  return callML("/recommendations", { incidents }, { recommendations: [] });
}

// ─── ML Health Check ─────────────────────────────────────────────

export async function checkMLHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}
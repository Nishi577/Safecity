/**
 * CityWatch – Description Analyzer
 * ─────────────────────────────────
 * Provides two independent analyses:
 *   1. descriptionQuality  → detects spam / weak / fake descriptions
 *   2. detectSeverity      → classifies the severity of the described incident
 *
 * All thresholds are exported as ANALYSIS_CONFIG so they can be tuned
 * later (or replaced with real ML/NLP models like TF-IDF, Naive Bayes, etc.)
 */

// ─── Configurable Thresholds ─────────────────────────────────────────────────

export const ANALYSIS_CONFIG = {
  /** Minimum total words before any analysis is shown */
  MIN_WORDS_FOR_ANALYSIS: 5,
  /** Minimum meaningful (non-filler) words required for a passing score */
  MIN_MEANINGFUL_WORDS: 4,
  /** Quality score threshold below which we warn the user */
  WARN_QUALITY_THRESHOLD: 40,
  /** Quality score threshold below which we show a stronger warning */
  WEAK_QUALITY_THRESHOLD: 20,
  /** Min words before we start showing the severity badge */
  MIN_WORDS_FOR_SEVERITY: 8,
  /** Repetition ratio (repeated words / total words) that flags spam */
  REPETITION_RATIO_THRESHOLD: 0.6,
  /** Unique character ratio below which we consider keyboard mashing */
  UNIQUE_CHAR_RATIO_THRESHOLD: 0.35,
  /** Max allowed consecutive identical characters before flagging */
  MAX_CONSECUTIVE_SAME_CHAR: 4,
};

// ─── Filler / Stop Words ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "was", "is", "are", "be", "been", "being", "have", "has", "had", "do",
  "does", "did", "will", "would", "could", "should", "may", "might",
  "a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet",
  "in", "on", "at", "to", "of", "by", "up", "out", "as", "into",
  "that", "this", "these", "those", "with", "from", "not", "no",
  "there", "then", "than", "too", "also", "just", "very",
]);

// ─── Known Fake / Meaningless Patterns ───────────────────────────────────────

const FAKE_PATTERNS: RegExp[] = [
  /^(test|testing|hello|hi|hey|abc|xyz|asdf|qwerty|foo|bar|baz)\s*$/i,
  /^(.)\1{4,}$/,                    // single char repeated: aaaaaaa
  /^[a-z]{2,6}(\s+\1){2,}$/i,      // same word 3+ times: "abc abc abc"
];

const MEANINGLESS_PHRASES = [
  "nothing happened", "nothing to report", "no incident",
  "test", "testing", "hello", "hi", "hey", "not sure",
  "i don't know", "idk", "lol", "haha",
];

// ─── Meaningful Keywords (boost quality score) ────────────────────────────────

const MEANINGFUL_KEYWORDS: string[] = [
  // What happened
  "stole", "theft", "robbery", "assault", "attack", "fight", "accident",
  "fire", "explosion", "missing", "injured", "hurt", "bleeding", "dead",
  "stabbed", "shot", "knife", "gun", "weapon", "threat", "threatening",
  "suspicious", "harass", "follow", "chase", "drunk", "drugs",
  // Who
  "man", "woman", "men", "women", "person", "people", "group", "male", "female",
  "suspect", "attacker", "victim", "child", "children", "officer",
  // Location context
  "street", "road", "park", "building", "shop", "store", "school", "market",
  "near", "behind", "inside", "outside", "alley", "corner",
  // Time context
  "morning", "afternoon", "evening", "night", "midnight", "today", "yesterday",
  "minute", "hour", "ago", "just now",
  // Injury / danger
  "hospital", "ambulance", "help", "danger", "emergency", "urgent", "police",
  "blood", "wound", "unconscious", "trapped",
  // Suspect details
  "wearing", "color", "tall", "short", "beard", "helmet", "vehicle",
  "bike", "car", "scooter", "auto", "plate",
];

// ─── Severity Keyword Sets ────────────────────────────────────────────────────

const SEVERITY_SETS: Record<string, string[]> = {
  CRITICAL: [
    "murder", "killed", "kill", "dead body", "corpse", "homicide",
    "bomb", "bombing", "explosion", "blast", "explosive", "grenade",
    "terrorist", "terrorism", "suicide bomber",
    "hostage", "kidnap", "kidnapping", "abducted", "abduction",
    "rape", "gang rape", "sexual assault", "molest",
    "shot dead", "stabbed to death", "beheaded", "burned alive",
    "acid attack", "honour killing", "child abduction", "missing child",
  ],
  HIGH: [
    "assault", "attacked", "beaten", "beat up", "punched", "kicked",
    "gun", "gunpoint", "firearm", "pistol", "knife", "sharp weapon",
    "machete", "blade", "armed", "weapon", "brandishing",
    "robbery", "armed robbery", "mugging", "snatching", "carjacking",
    "fire", "arson", "burning building", "house fire",
    "riot", "mob attack", "mob violence", "violent protest",
    "shooting", "stabbing", "stabbed", "shot", "gunshot",
    "domestic violence", "hit and run", "road rage", "suicide attempt",
    "extortion", "blackmail", "death threat",
    "missing person", "missing", "disappeared",
  ],
  MEDIUM: [
    "theft", "stolen", "steal", "pickpocket", "shoplifting",
    "burglary", "break-in", "broke into",
    "fraud", "scam", "cheating", "cyber fraud", "phishing",
    "harassment", "stalking", "stalker", "following",
    "sexual harassment", "threatening messages",
    "drug", "drugs", "narcotics", "intoxicated", "drunk",
    "vandalism", "damaged", "graffiti", "slashed tyres",
    "accident", "collision", "crashed",
    "trespassing", "encroachment",
  ],
  LOW: [
    "noise", "loud music", "loud party", "nuisance",
    "argument", "quarrel", "verbal fight", "shouting",
    "parking", "traffic jam", "pothole",
    "stray dog", "stray animal",
    "garbage", "littering", "waterlogging", "street light",
    "broken road", "power cut",
    "suspicious activity", "suspicious person",
    "lost item", "found item", "minor",
  ],
};

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function countRepetitions(words: string[]): number {
  if (!words.length) return 0;
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const repeated = Object.values(freq).filter((c) => c > 1).reduce((s, c) => s + (c - 1), 0);
  return repeated / words.length;
}

function uniqueCharRatio(text: string): number {
  const clean = text.replace(/\s/g, "").toLowerCase();
  if (!clean.length) return 1;
  return new Set(clean).size / clean.length;
}

function hasKeyboardMash(text: string): boolean {
  // Detect long runs of consonants with no vowels (e.g. "asdfghjkl")
  const withoutSpaces = text.replace(/\s/g, "").toLowerCase();
  const noVowelRun = /[^aeiou\d]{7,}/.test(withoutSpaces);
  // Detect many repeated chars: "aaaaaa"
  const repeatedChar = /(.)\1{4,}/.test(withoutSpaces);
  return noVowelRun || repeatedChar;
}

// ─── ANALYSIS 1: Description Quality ─────────────────────────────────────────

export interface QualityResult {
  score: number;           // 0–100
  level: "good" | "warn" | "weak" | "empty";
  issues: string[];
  hints: string[];
  isSuspicious: boolean;
}

export function analyzeDescriptionQuality(description: string): QualityResult {
  const trimmed = description.trim();

  if (!trimmed) {
    return { score: 0, level: "empty", issues: [], hints: [], isSuspicious: false };
  }

  const words = tokenize(trimmed);
  const wordCount = words.length;
  const issues: string[] = [];

  if (wordCount < ANALYSIS_CONFIG.MIN_WORDS_FOR_ANALYSIS) {
    return {
      score: Math.max(5, wordCount * 4),
      level: "weak",
      issues: ["Description is too short."],
      hints: ["Try to describe what happened in at least 2–3 sentences."],
      isSuspicious: false,
    };
  }

  let score = 100;

  // ── Fake pattern checks ─────────────────────────────────────────
  for (const rx of FAKE_PATTERNS) {
    if (rx.test(trimmed)) {
      issues.push("This looks like a test or placeholder entry.");
      score -= 60;
      break;
    }
  }

  // ── Meaningless phrases ─────────────────────────────────────────
  const lower = trimmed.toLowerCase();
  const foundMeaningless = MEANINGLESS_PHRASES.some((p) => lower.includes(p));
  if (foundMeaningless) {
    issues.push("Description contains a non-informative phrase.");
    score -= 40;
  }

  // ── Keyboard mash detection ─────────────────────────────────────
  if (hasKeyboardMash(trimmed)) {
    issues.push("Detected random character sequences.");
    score -= 35;
  }

  // ── Unique character ratio (mash detection via entropy) ─────────
  const uRatio = uniqueCharRatio(trimmed);
  if (uRatio < ANALYSIS_CONFIG.UNIQUE_CHAR_RATIO_THRESHOLD) {
    issues.push("Description contains highly repetitive characters.");
    score -= 25;
  }

  // ── Repetition detection ────────────────────────────────────────
  const repRatio = countRepetitions(words);
  if (repRatio > ANALYSIS_CONFIG.REPETITION_RATIO_THRESHOLD) {
    issues.push("Many words are repeated excessively.");
    score -= 20;
  } else if (repRatio > 0.4) {
    score -= 10;
  }

  // ── Meaningful word boost ───────────────────────────────────────
  const meaningfulWords = words.filter((w) => !STOP_WORDS.has(w) && w.length > 2);
  const meaningfulMatches = meaningfulWords.filter((w) =>
    MEANINGFUL_KEYWORDS.includes(w)
  ).length;

  // Bonus for meaningful keyword presence
  score = Math.min(100, score + meaningfulMatches * 5);

  // Penalty for too few meaningful words
  if (meaningfulWords.length < ANALYSIS_CONFIG.MIN_MEANINGFUL_WORDS) {
    issues.push("Not enough descriptive detail provided.");
    score -= 20;
  }

  // ── Word count bonus ────────────────────────────────────────────
  if (wordCount >= 20) score = Math.min(100, score + 10);
  else if (wordCount >= 12) score = Math.min(100, score + 5);

  score = Math.max(0, Math.min(100, score));

  // ── Generate contextual hints ───────────────────────────────────
  const hints: string[] = [];
  if (score < ANALYSIS_CONFIG.WARN_QUALITY_THRESHOLD) {
    if (!lower.includes("who") && !lower.match(/man|woman|person|people|group/))
      hints.push("Who was involved? Describe their appearance if you can.");
    if (!lower.match(/street|road|park|near|corner|building|shop|area|location/))
      hints.push("Where exactly did it happen? Include nearby landmarks.");
    if (!lower.match(/hurt|injur|bleed|wound|hospital|ambulance/))
      hints.push("Was anyone hurt or in danger? This helps prioritize the response.");
    if (!lower.match(/now|ago|morning|evening|night|yesterday|today|minute|hour/))
      hints.push("When did it happen? Even an estimate helps responders.");
  }

  // ── Final level ─────────────────────────────────────────────────
  let level: QualityResult["level"];
  if (score >= ANALYSIS_CONFIG.WARN_QUALITY_THRESHOLD) level = "good";
  else if (score >= ANALYSIS_CONFIG.WEAK_QUALITY_THRESHOLD) level = "warn";
  else level = "weak";

  const isSuspicious = score < ANALYSIS_CONFIG.WEAK_QUALITY_THRESHOLD;

  return { score, level, issues, hints, isSuspicious };
}

// ─── ANALYSIS 2: Severity Detection ──────────────────────────────────────────

export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SeverityResult {
  level: SeverityLevel;
  confidence: number;     // 0–1
  matchedKeywords: string[];
  color: string;
  label: string;
  description: string;
}

export function detectSeverity(text: string): SeverityResult | null {
  const words = tokenize(text);
  if (words.length < ANALYSIS_CONFIG.MIN_WORDS_FOR_SEVERITY) return null;

  const lower = text.toLowerCase();
  const scores: Record<SeverityLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const matched: string[] = [];

  for (const [level, keywords] of Object.entries(SEVERITY_SETS) as [SeverityLevel, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[level] += 1;
        if (!matched.includes(kw)) matched.push(kw);
      }
    }
  }

  // Find the highest-priority level with matches
  const ORDER: SeverityLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  let detectedLevel: SeverityLevel = "LOW";
  for (const lvl of ORDER) {
    if (scores[lvl] > 0) {
      detectedLevel = lvl;
      break;
    }
  }

  // If no keywords matched at all, do not show a badge
  const totalMatches = Object.values(scores).reduce((s, v) => s + v, 0);
  if (totalMatches === 0) return null;

  // Confidence = matched keywords / total possible indicators (capped at 1)
  const confidence = Math.min(1, totalMatches / 5);

  const META: Record<SeverityLevel, { color: string; label: string; description: string }> = {
    LOW: {
      color: "bg-green-100 text-green-800 border-green-300",
      label: "Low Severity",
      description: "Minor incident. No immediate danger detected.",
    },
    MEDIUM: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      label: "Medium Severity",
      description: "Moderate concern. Requires attention but not immediately life-threatening.",
    },
    HIGH: {
      color: "bg-orange-100 text-orange-800 border-orange-300",
      label: "High Severity",
      description: "Serious incident. Responders should be dispatched promptly.",
    },
    CRITICAL: {
      color: "bg-red-100 text-red-800 border-red-300",
      label: "Critical Severity",
      description: "Life-threatening situation. Immediate emergency response required.",
    },
  };

  return {
    level: detectedLevel,
    confidence,
    matchedKeywords: matched,
    ...META[detectedLevel],
  };
}

// ─── Combined Entry Point ─────────────────────────────────────────────────────

export interface DescriptionAnalysis {
  quality: QualityResult;
  severity: SeverityResult | null;
}

export function analyzeDescription(description: string): DescriptionAnalysis {
  return {
    quality: analyzeDescriptionQuality(description),
    severity: detectSeverity(description),
  };
}

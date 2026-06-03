/**
 * DescriptionAnalyzer – Real-time inline feedback for the incident description field.
 *
 * Shows:
 *  • A quality bar (poor → good) with specific improvement hints
 *  • A severity badge (Low / Medium / High / Critical) once enough text is entered
 *  • Supportive, non-accusatory guidance messages
 *
 * Usage:
 *   <DescriptionAnalyzer description={formData.description} />
 */

import { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { analyzeDescription, type DescriptionAnalysis, type SeverityLevel } from "@/lib/descriptionAnalyzer";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DescriptionAnalyzerProps {
  description: string;
  /** Called whenever the suspicion flag changes (optional – lets parent react) */
  onSuspicionChange?: (isSuspicious: boolean, reason: string) => void;
  /** Called whenever severity changes (optional) */
  onSeverityChange?: (severity: SeverityLevel | null) => void;
}

// ─── Severity Badge Config ────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<SeverityLevel, { bg: string; text: string; border: string; icon: typeof Zap }> = {
  LOW:      { bg: "bg-green-50",   text: "text-green-800",  border: "border-green-200", icon: CheckCircle2 },
  MEDIUM:   { bg: "bg-yellow-50",  text: "text-yellow-800", border: "border-yellow-200", icon: AlertCircle },
  HIGH:     { bg: "bg-orange-50",  text: "text-orange-800", border: "border-orange-200", icon: AlertTriangle },
  CRITICAL: { bg: "bg-red-50",     text: "text-red-800",    border: "border-red-200",   icon: ShieldAlert },
};

// ─── Quality Bar ──────────────────────────────────────────────────────────────

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-500" :
    score >= 40 ? "bg-yellow-400" :
    "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${
        score >= 70 ? "text-green-700" : score >= 40 ? "text-yellow-700" : "text-red-600"
      }`}>
        {score}/100
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DescriptionAnalyzer({
  description,
  onSuspicionChange,
  onSeverityChange,
}: DescriptionAnalyzerProps) {
  const analysis: DescriptionAnalysis = useMemo(() => {
    const result = analyzeDescription(description);

    // Side-effect callbacks (run inside useMemo would be anti-pattern but safe here
    // since callers just sync state they read from external source anyway)
    onSuspicionChange?.(result.quality.isSuspicious, result.quality.issues.join("; "));
    onSeverityChange?.(result.severity?.level ?? null);

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  const { quality, severity } = analysis;

  // Don't render anything until user has typed something
  if (!description.trim() || quality.level === "empty") return null;

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">

      {/* ── Quality Bar ─────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Description Quality
          </span>
          <span className="text-[10px] text-muted-foreground">
            {wordCount} word{wordCount !== 1 ? "s" : ""}
          </span>
        </div>
        <QualityBar score={quality.score} />
      </div>

      {/* ── Good Quality Message ─────────────────────────────────── */}
      {quality.level === "good" && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Good description! This will help authorities respond effectively.
        </div>
      )}

      {/* ── Warning Message ──────────────────────────────────────── */}
      {quality.level === "warn" && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Consider adding more detail for a faster response.
          </div>
          {quality.hints.slice(0, 2).map((hint, i) => (
            <p key={i} className="text-[11px] text-amber-600 pl-5 leading-snug">• {hint}</p>
          ))}
        </div>
      )}

      {/* ── Weak / Suspicious Warning ────────────────────────────── */}
      {quality.level === "weak" && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Please provide a more meaningful description.
          </div>
          <p className="text-[11px] text-red-600 pl-5 leading-snug">
            Your description appears too short or unclear. Authorities need context to act.
          </p>
          {quality.hints.length > 0 && (
            <div className="space-y-0.5 pl-5">
              {quality.hints.map((hint, i) => (
                <p key={i} className="text-[11px] text-red-500 leading-snug">• {hint}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Severity Badge ────────────────────────────────────────── */}
      {severity && (
        <div className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 animate-in fade-in duration-500 ${SEVERITY_BADGE[severity.level].bg} ${SEVERITY_BADGE[severity.level].border}`}>
          {(() => {
            const Icon = SEVERITY_BADGE[severity.level].icon;
            return <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${SEVERITY_BADGE[severity.level].text}`} />;
          })()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className={`text-xs font-bold ${SEVERITY_BADGE[severity.level].text}`}>
                AI Severity Estimate: {severity.label}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${SEVERITY_BADGE[severity.level].bg} ${SEVERITY_BADGE[severity.level].border} ${SEVERITY_BADGE[severity.level].text}`}>
                {Math.round(severity.confidence * 100)}% match
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 leading-snug ${SEVERITY_BADGE[severity.level].text} opacity-80`}>
              {severity.description}
            </p>
            {severity.matchedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {severity.matchedKeywords.slice(0, 5).map((kw, i) => (
                  <span
                    key={i}
                    className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[severity.level].bg} ${SEVERITY_BADGE[severity.level].border} ${SEVERITY_BADGE[severity.level].text} opacity-75`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Writing Guide (shown when description is still weak) ─── */}
      {quality.level !== "good" && wordCount < 20 && (
        <div className="bg-muted/40 border border-border/50 rounded-md px-3 py-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Try including:
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {[
              "What happened exactly",
              "Who was involved",
              "Location & landmarks",
              "Time of the incident",
              "Whether anyone was hurt",
              "Suspect direction or vehicle",
            ].map((tip, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">• {tip}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Severity Badge (standalone, for dashboards) ──────────────────────────────

interface SeverityBadgeProps {
  severity: string | null | undefined;
  size?: "sm" | "md";
}

export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  if (!severity) return null;

  const lvl = severity.toUpperCase() as SeverityLevel;
  const cfg = SEVERITY_BADGE[lvl] ?? SEVERITY_BADGE.LOW;
  const Icon = cfg.icon;
  const label = lvl.charAt(0) + lvl.slice(1).toLowerCase();

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

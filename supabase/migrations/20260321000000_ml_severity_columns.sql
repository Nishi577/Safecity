-- Migration: Add ML severity prediction column to incidents
-- Safe: only ADD new column, no existing columns modified

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS ml_severity text,
  ADD COLUMN IF NOT EXISTS ml_confidence float,
  ADD COLUMN IF NOT EXISTS is_suspicious_report boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious_reason text,
  ADD COLUMN IF NOT EXISTS similar_cases_count integer DEFAULT 0;

COMMENT ON COLUMN public.incidents.ml_severity IS 'ML-predicted severity: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN public.incidents.ml_confidence IS 'ML model confidence score 0-1';
COMMENT ON COLUMN public.incidents.is_suspicious_report IS 'Flagged as potentially suspicious by ML detector';
COMMENT ON COLUMN public.incidents.suspicious_reason IS 'Reason for suspicious flag';
COMMENT ON COLUMN public.incidents.similar_cases_count IS 'Number of similar past incidents found by ML';

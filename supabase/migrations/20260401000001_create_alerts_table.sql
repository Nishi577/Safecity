-- Migration: Create alerts table for public safety broadcasts
-- Safe: only CREATE NEW table, no existing tables modified

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  higher_officer_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'both',
  duration TEXT NOT NULL DEFAULT '12h',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can view alerts
CREATE POLICY "Anyone can view alerts"
ON public.alerts FOR SELECT
USING (true);

-- Only higher officers and admins can manage alerts
CREATE POLICY "Higher officers and admins can manage alerts"
ON public.alerts FOR ALL
USING (has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

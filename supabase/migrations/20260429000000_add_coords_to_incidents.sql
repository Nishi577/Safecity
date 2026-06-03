
-- Add coordinate columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Make citizen_id nullable to support SOS reports without an account
ALTER TABLE public.incidents 
ALTER COLUMN citizen_id DROP NOT NULL;

-- Allow anyone to submit an SOS report (is_emergency = true) without being logged in
CREATE POLICY "Anyone can submit SOS incidents"
ON public.incidents FOR INSERT
WITH CHECK (is_emergency = true AND (auth.uid() IS NULL OR citizen_id = auth.uid()));

-- Ensure anonymous SOS reports are visible to higher officers and admins
-- (Existing policies already allow this if they have the role)

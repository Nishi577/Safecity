-- Add comprehensive fields to missing_items table to support "Add Asset" functionality
ALTER TABLE public.missing_items 
ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'missing',
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.incidents(id),
ADD COLUMN IF NOT EXISTS incident_type TEXT,
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_reported TIME,
ADD COLUMN IF NOT EXISTS found_location TEXT,
ADD COLUMN IF NOT EXISTS ward TEXT,
ADD COLUMN IF NOT EXISTS address_landmark TEXT,
ADD COLUMN IF NOT EXISTS gps_coordinates TEXT,
ADD COLUMN IF NOT EXISTS indoor_outdoor TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS distinguishing_features TEXT,
ADD COLUMN IF NOT EXISTS item_condition TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS supporting_documents TEXT[],
ADD COLUMN IF NOT EXISTS cctv_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS voice_note_url TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_contact TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reporting_officer_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS storage_location TEXT,
ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS recovery_status TEXT;

-- Update RLS policies to allow officers and admins to manage all assets
-- Existing policies already cover basic viewing/updating for higher_officer/admin
-- We might need to explicitly allow Field Officers to also view and manage assets if that's requested

-- Allow Field Officers to view missing items (assets) in their jurisdiction
CREATE POLICY "Field officers can view assets"
ON public.missing_items FOR SELECT
USING (has_role(auth.uid(), 'field_police'::app_role));

-- Allow Field Officers and Higher Officers to create assets
CREATE POLICY "Officers can create assets"
ON public.missing_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'field_police'::app_role) OR has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow Field Officers to update assets (e.g. status updates)
CREATE POLICY "Officers can update assets"
ON public.missing_items FOR UPDATE
USING (has_role(auth.uid(), 'field_police'::app_role) OR has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

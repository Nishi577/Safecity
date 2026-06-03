-- Add jurisdiction fields to profiles (for officers)
ALTER TABLE public.profiles 
ADD COLUMN city TEXT,
ADD COLUMN area TEXT;

-- Add structured location fields to incidents (for routing)
ALTER TABLE public.incidents 
ADD COLUMN city TEXT,
ADD COLUMN area TEXT;

-- Update RLS policy for Higher Officers to only see incidents in their jurisdiction
DROP POLICY IF EXISTS "Higher officers can view all incidents" ON public.incidents;
CREATE POLICY "Higher officers can view incidents in their jurisdiction"
ON public.incidents
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND (
    -- Show incidents that match officer's jurisdiction
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.city = incidents.city
    )
    -- Also show incidents without city (legacy data) to higher officers
    OR incidents.city IS NULL
  )
);

-- Update Higher Officers update policy to only update incidents in their jurisdiction
DROP POLICY IF EXISTS "Higher officers can update incidents" ON public.incidents;
CREATE POLICY "Higher officers can update incidents in their jurisdiction"
ON public.incidents
FOR UPDATE
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.city = incidents.city
    )
    OR incidents.city IS NULL
  )
);

-- Update policy for Higher Officers to view field officer profiles in their jurisdiction
DROP POLICY IF EXISTS "Higher officers can view field officer profiles" ON public.profiles;
CREATE POLICY "Higher officers can view field officer profiles in their jurisdiction"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id 
    AND user_roles.role = 'field_police'
  )
  AND (
    -- Same city jurisdiction
    profiles.city = (SELECT p.city FROM public.profiles p WHERE p.user_id = auth.uid())
    -- Or officer has no city set (legacy data)
    OR profiles.city IS NULL
  )
);

-- Create index for faster jurisdiction queries
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_incidents_city ON public.incidents(city);
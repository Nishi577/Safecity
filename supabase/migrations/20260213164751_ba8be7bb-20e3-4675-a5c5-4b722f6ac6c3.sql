
-- 1. Officer Registry table for auto-verification
CREATE TABLE public.officer_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id TEXT NOT NULL UNIQUE,
  official_email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'field_police',
  city TEXT,
  area TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.officer_registry ENABLE ROW LEVEL SECURITY;

-- Only admins can manage officer registry
CREATE POLICY "Admins can view officer registry"
ON public.officer_registry FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert officer registry"
ON public.officer_registry FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update officer registry"
ON public.officer_registry FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete officer registry"
ON public.officer_registry FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon/authenticated to check registry during signup (limited)
CREATE POLICY "Anyone can check registry for verification"
ON public.officer_registry FOR SELECT
USING (true);

CREATE TRIGGER update_officer_registry_updated_at
BEFORE UPDATE ON public.officer_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. SOS Reports table (no auth required)
CREATE TABLE public.sos_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  emergency_type TEXT NOT NULL,
  message TEXT,
  city TEXT,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit SOS (no login required)
CREATE POLICY "Anyone can submit SOS"
ON public.sos_reports FOR INSERT
WITH CHECK (true);

-- Officers and admins can view SOS reports
CREATE POLICY "Higher officers can view SOS"
ON public.sos_reports FOR SELECT
USING (has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Officers can update SOS status
CREATE POLICY "Officers can update SOS"
ON public.sos_reports FOR UPDATE
USING (has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Missing Items table
CREATE TABLE public.missing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  last_seen_location TEXT,
  city TEXT,
  area TEXT,
  date_lost DATE,
  contact_info TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  officer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.missing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can create missing items"
ON public.missing_items FOR INSERT
WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Citizens can view their own missing items"
ON public.missing_items FOR SELECT
USING (auth.uid() = citizen_id);

CREATE POLICY "Higher officers can view all missing items"
ON public.missing_items FOR SELECT
USING (has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Higher officers can update missing items"
ON public.missing_items FOR UPDATE
USING (has_role(auth.uid(), 'higher_officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_missing_items_updated_at
BEFORE UPDATE ON public.missing_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Update handle_new_user to support auto-verification from officer registry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role app_role;
  is_auto_approved boolean;
  user_email text;
  badge text;
  registry_match record;
BEGIN
  requested_role := COALESCE(
    (NEW.raw_user_meta_data->>'requested_role')::app_role,
    'citizen'
  );
  
  user_email := LOWER(NEW.email);
  badge := NEW.raw_user_meta_data->>'badge_id';
  
  -- Auto-approve logic:
  -- 1. Citizens are always auto-approved
  -- 2. Admins with correct email domain are auto-approved
  -- 3. Officers matching registry are auto-approved
  is_auto_approved := (requested_role = 'citizen') OR 
                      (requested_role = 'admin' AND user_email LIKE '%@admincity.com');
  
  -- Check officer registry for auto-verification
  IF NOT is_auto_approved AND requested_role IN ('field_police', 'higher_officer') THEN
    SELECT * INTO registry_match
    FROM public.officer_registry
    WHERE is_active = true
      AND (
        (badge IS NOT NULL AND officer_registry.badge_id = badge)
        OR officer_registry.official_email = user_email
      )
      AND officer_registry.role = requested_role;
    
    IF FOUND THEN
      is_auto_approved := true;
      -- Create profile with registry jurisdiction
      INSERT INTO public.profiles (user_id, full_name, city, area)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', registry_match.full_name), registry_match.city, registry_match.area);
      
      INSERT INTO public.user_roles (user_id, role, is_approved)
      VALUES (NEW.id, requested_role, true);
      
      RETURN NEW;
    END IF;
  END IF;
  
  -- Create profile (default path)
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, requested_role, is_auto_approved);
  
  RETURN NEW;
END;
$$;

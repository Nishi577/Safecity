-- Add approval status tracking to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false,
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN created_at timestamp with time zone NOT NULL DEFAULT now();

-- Citizens are auto-approved, update the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role app_role;
  is_auto_approved boolean;
BEGIN
  -- Get the requested role from metadata, default to citizen
  requested_role := COALESCE(
    (NEW.raw_user_meta_data->>'requested_role')::app_role,
    'citizen'
  );
  
  -- Citizens are auto-approved, others need admin approval
  is_auto_approved := (requested_role = 'citizen');
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign requested role with appropriate approval status
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, requested_role, is_auto_approved);
  
  RETURN NEW;
END;
$$;

-- Create incidents table for the workflow
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  subcategory text,
  description text NOT NULL,
  location_description text,
  landmark text,
  incident_date date,
  incident_time time,
  urgency text NOT NULL DEFAULT 'medium',
  suspect_description text,
  vehicle_info text,
  additional_info text,
  is_emergency boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  priority_score integer,
  ml_priority_suggestion text,
  assigned_officer_id uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone,
  deadline timestamp with time zone,
  department text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolution_notes text
);

-- Enable RLS on incidents
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Citizens can view their own incidents
CREATE POLICY "Citizens can view their own incidents"
ON public.incidents FOR SELECT
USING (auth.uid() = citizen_id);

-- Citizens can create incidents
CREATE POLICY "Citizens can create incidents"
ON public.incidents FOR INSERT
WITH CHECK (auth.uid() = citizen_id);

-- Higher officers can view all incidents
CREATE POLICY "Higher officers can view all incidents"
ON public.incidents FOR SELECT
USING (public.has_role(auth.uid(), 'higher_officer'));

-- Higher officers can update incidents (assign, set priority, etc)
CREATE POLICY "Higher officers can update incidents"
ON public.incidents FOR UPDATE
USING (public.has_role(auth.uid(), 'higher_officer'));

-- Field police can view their assigned incidents
CREATE POLICY "Field police can view assigned incidents"
ON public.incidents FOR SELECT
USING (public.has_role(auth.uid(), 'field_police') AND assigned_officer_id = auth.uid());

-- Field police can update their assigned incidents
CREATE POLICY "Field police can update assigned incidents"
ON public.incidents FOR UPDATE
USING (public.has_role(auth.uid(), 'field_police') AND assigned_officer_id = auth.uid());

-- Admins can view all incidents
CREATE POLICY "Admins can view all incidents"
ON public.incidents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create case updates table for field officer daily updates
CREATE TABLE public.case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  officer_id uuid NOT NULL REFERENCES auth.users(id),
  update_text text NOT NULL,
  status_change text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on case_updates
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;

-- Officers can view updates for their cases
CREATE POLICY "Officers can view their case updates"
ON public.case_updates FOR SELECT
USING (officer_id = auth.uid() OR public.has_role(auth.uid(), 'higher_officer') OR public.has_role(auth.uid(), 'admin'));

-- Officers can create updates for their assigned cases
CREATE POLICY "Officers can create updates"
ON public.case_updates FOR INSERT
WITH CHECK (officer_id = auth.uid());

-- Citizens can view updates on their cases
CREATE POLICY "Citizens can view their case updates"
ON public.case_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = case_updates.incident_id 
    AND incidents.citizen_id = auth.uid()
  )
);

-- Create audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Higher officers and admins can view audit logs
CREATE POLICY "Officers can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'higher_officer') OR public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (via service role)
CREATE POLICY "System can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = actor_id);

-- Add RLS policy for admins to manage user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;

-- Create updated_at trigger for incidents
CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
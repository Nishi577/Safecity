-- Update the handle_new_user function to auto-approve Admins with correct email domain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_role app_role;
  is_auto_approved boolean;
  user_email text;
BEGIN
  -- Get the requested role from metadata, default to citizen
  requested_role := COALESCE(
    (NEW.raw_user_meta_data->>'requested_role')::app_role,
    'citizen'
  );
  
  -- Get user email
  user_email := LOWER(NEW.email);
  
  -- Auto-approve logic:
  -- 1. Citizens are always auto-approved
  -- 2. Admins with correct email domain (@admincity.com) are auto-approved
  is_auto_approved := (requested_role = 'citizen') OR 
                      (requested_role = 'admin' AND user_email LIKE '%@admincity.com');
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign requested role with appropriate approval status
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, requested_role, is_auto_approved);
  
  RETURN NEW;
END;
$function$;
-- Allow Higher Officers to view field_police user roles (for case assignment)
CREATE POLICY "Higher officers can view field police roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND role = 'field_police'
);

-- Allow Higher Officers to view profiles of field officers (for dropdown display)
CREATE POLICY "Higher officers can view field officer profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.user_id 
    AND user_roles.role = 'field_police'
  )
);

-- Allow Admins to view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
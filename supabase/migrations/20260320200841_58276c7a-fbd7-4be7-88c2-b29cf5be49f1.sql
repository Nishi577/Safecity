-- Update higher officer incident view policy to also filter by area
DROP POLICY IF EXISTS "Higher officers can view incidents in their city" ON public.incidents;
CREATE POLICY "Higher officers can view incidents in their city and area"
ON public.incidents
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND (
    (get_user_city(auth.uid()) IS NULL) OR (city IS NULL) OR (city = get_user_city(auth.uid()))
  )
  AND (
    (get_user_area(auth.uid()) IS NULL) OR (area IS NULL) OR (area = get_user_area(auth.uid()))
  )
);

-- Update higher officer incident update policy to also filter by area
DROP POLICY IF EXISTS "Higher officers can update incidents in their city" ON public.incidents;
CREATE POLICY "Higher officers can update incidents in their city and area"
ON public.incidents
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND (
    (get_user_city(auth.uid()) IS NULL) OR (city IS NULL) OR (city = get_user_city(auth.uid()))
  )
  AND (
    (get_user_area(auth.uid()) IS NULL) OR (area IS NULL) OR (area = get_user_area(auth.uid()))
  )
);

-- Update higher officer profile view policy to also filter by area
DROP POLICY IF EXISTS "Higher officers can view field officer profiles in their city" ON public.profiles;
CREATE POLICY "Higher officers can view field officer profiles in their jurisdiction"
ON public.profiles
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = profiles.user_id
    AND user_roles.role = 'field_police'::app_role
  ))
  AND ((get_user_city(auth.uid()) IS NULL) OR (city IS NULL) OR (city = get_user_city(auth.uid())))
  AND ((get_user_area(auth.uid()) IS NULL) OR (area IS NULL) OR (area = get_user_area(auth.uid())))
);
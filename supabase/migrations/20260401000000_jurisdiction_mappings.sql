CREATE TABLE IF NOT EXISTS public.jurisdiction_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area VARCHAR NOT NULL,
  city VARCHAR DEFAULT 'Mumbai',
  higher_officer_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(area, city)
);

ALTER TABLE public.jurisdiction_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.jurisdiction_mappings
  FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins" ON public.jurisdiction_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS assigned_higher_officer_id UUID REFERENCES public.profiles(user_id);

CREATE OR REPLACE FUNCTION set_assigned_higher_officer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_emergency = true THEN
    SELECT higher_officer_id INTO NEW.assigned_higher_officer_id
    FROM public.jurisdiction_mappings
    WHERE area ILIKE NEW.area AND city ILIKE NEW.city
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_assigned_higher_officer
BEFORE INSERT OR UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION set_assigned_higher_officer();

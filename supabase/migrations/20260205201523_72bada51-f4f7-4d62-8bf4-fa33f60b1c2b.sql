-- Fix RLS infinite recursion by creating security definer functions for profile lookups

-- Create a function to get a user's city without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_city(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT city FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create a function to get a user's area without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_area(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Higher officers can view field officer profiles in their jurisd" ON public.profiles;
DROP POLICY IF EXISTS "Higher officers can view incidents in their jurisdiction" ON public.incidents;
DROP POLICY IF EXISTS "Higher officers can update incidents in their jurisdiction" ON public.incidents;

-- Recreate profiles policy for Higher Officers using the security definer function
CREATE POLICY "Higher officers can view field officer profiles in their city"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = profiles.user_id 
      AND user_roles.role = 'field_police'::app_role
    )
  )
  AND (
    get_user_city(auth.uid()) IS NULL 
    OR city IS NULL 
    OR city = get_user_city(auth.uid())
  )
);

-- Recreate incidents SELECT policy for Higher Officers
CREATE POLICY "Higher officers can view incidents in their city"
ON public.incidents
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND (
    get_user_city(auth.uid()) IS NULL 
    OR city IS NULL 
    OR city = get_user_city(auth.uid())
  )
);

-- Recreate incidents UPDATE policy for Higher Officers
CREATE POLICY "Higher officers can update incidents in their city"
ON public.incidents
FOR UPDATE
USING (
  has_role(auth.uid(), 'higher_officer'::app_role) 
  AND (
    get_user_city(auth.uid()) IS NULL 
    OR city IS NULL 
    OR city = get_user_city(auth.uid())
  )
);

-- Create messages table for citizen-officer chat
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Citizens can view messages for their own incidents
CREATE POLICY "Citizens can view their incident messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = messages.incident_id 
    AND incidents.citizen_id = auth.uid()
  )
);

-- Citizens can send messages to their own incidents (only if assigned)
CREATE POLICY "Citizens can send messages to assigned incidents"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = messages.incident_id 
    AND incidents.citizen_id = auth.uid()
    AND incidents.assigned_officer_id IS NOT NULL
  )
);

-- Field officers can view messages for their assigned incidents
CREATE POLICY "Officers can view assigned incident messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = messages.incident_id 
    AND incidents.assigned_officer_id = auth.uid()
  )
);

-- Field officers can send messages to their assigned incidents
CREATE POLICY "Officers can send messages to assigned incidents"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = messages.incident_id 
    AND incidents.assigned_officer_id = auth.uid()
  )
);

-- Higher officers and admins can view all messages in their jurisdiction
CREATE POLICY "Higher officers can view messages in jurisdiction"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'higher_officer'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.incidents 
    WHERE incidents.id = messages.incident_id 
    AND (
      get_user_city(auth.uid()) IS NULL 
      OR incidents.city IS NULL 
      OR incidents.city = get_user_city(auth.uid())
    )
  )
);

CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_incident_id ON public.messages(incident_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
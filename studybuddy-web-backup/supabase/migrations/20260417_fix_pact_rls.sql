-- Fix RLS recursion for pact_members and pacts
CREATE OR REPLACE FUNCTION public.is_pact_member(pact_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pact_members
    WHERE pact_id = pact_uuid
      AND user_id = user_uuid
  );
$$;

REVOKE ALL ON FUNCTION public.is_pact_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pact_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view pact members they are part of" ON public.pact_members;
CREATE POLICY "Users can view pact members they are part of"
  ON public.pact_members FOR SELECT
  USING (public.is_pact_member(pact_members.pact_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view all pacts they are members of" ON public.pacts;
CREATE POLICY "Users can view all pacts they are members of"
  ON public.pacts FOR SELECT
  USING (public.is_pact_member(pacts.id, auth.uid()));

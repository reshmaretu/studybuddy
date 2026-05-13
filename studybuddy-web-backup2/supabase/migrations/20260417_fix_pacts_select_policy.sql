-- Allow pact creator to view newly created pact
DROP POLICY IF EXISTS "Users can view all pacts they are members of" ON public.pacts;

CREATE POLICY "Users can view all pacts they are members of"
  ON public.pacts FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_pact_member(pacts.id, auth.uid())
  );

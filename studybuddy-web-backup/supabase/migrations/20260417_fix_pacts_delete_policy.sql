-- Allow pact creator to delete their pact
DROP POLICY IF EXISTS "Users can delete their own pacts" ON public.pacts;

CREATE POLICY "Users can delete their own pacts"
  ON public.pacts FOR DELETE
  USING (created_by = auth.uid());

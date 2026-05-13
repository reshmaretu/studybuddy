-- Ensure insert policy exists for pacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pacts'
      AND policyname = 'Users can create pacts'
  ) THEN
    CREATE POLICY "Users can create pacts"
      ON public.pacts FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

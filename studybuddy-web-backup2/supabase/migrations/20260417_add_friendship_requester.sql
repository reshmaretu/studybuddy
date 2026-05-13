-- Track request direction and prevent duplicate friendships
ALTER TABLE public.user_friendships
  ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'requester_is_participant'
      AND conrelid = 'public.user_friendships'::regclass
  ) THEN
    ALTER TABLE public.user_friendships
      ADD CONSTRAINT requester_is_participant
      CHECK (requester_id IS NULL OR requester_id = user_id_1 OR requester_id = user_id_2);
  END IF;
END $$;

-- Backfill legacy rows (best-effort)
UPDATE public.user_friendships
SET requester_id = user_id_1
WHERE requester_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_friendships_requester_id
  ON public.user_friendships(requester_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair
  ON public.user_friendships(user_id_1, user_id_2);

-- Update policies to require requester_id on inserts
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.user_friendships;

CREATE POLICY "Users can create friendship requests"
  ON public.user_friendships FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  );

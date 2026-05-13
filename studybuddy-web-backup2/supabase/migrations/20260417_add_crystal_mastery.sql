-- Crystal growth tracker
CREATE TABLE IF NOT EXISTS public.crystal_growth (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  growth INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crystal_growth_user_id ON public.crystal_growth(user_id);

-- Crystal mastery hall
CREATE TABLE IF NOT EXISTS public.crystal_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crystal_name TEXT NOT NULL,
  mastered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  growth_at_mastery INTEGER NOT NULL DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_crystal_mastery_user_id ON public.crystal_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_crystal_mastery_mastered_at ON public.crystal_mastery(mastered_at DESC);

ALTER TABLE public.crystal_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crystal_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their crystal growth"
  ON public.crystal_growth FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their crystal growth"
  ON public.crystal_growth FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their crystal growth"
  ON public.crystal_growth FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their crystal mastery"
  ON public.crystal_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their crystal mastery"
  ON public.crystal_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

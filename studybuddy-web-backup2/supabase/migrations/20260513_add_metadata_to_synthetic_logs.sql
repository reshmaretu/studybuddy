-- Add metadata column to synthetic_logs for richer room broadcasts
ALTER TABLE public.synthetic_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

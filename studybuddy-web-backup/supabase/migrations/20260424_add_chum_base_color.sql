-- Ensure chum_wardrobe table has active_chum_base_color and requester_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chum_wardrobe' AND column_name = 'active_chum_base_color'
  ) THEN
    ALTER TABLE public.chum_wardrobe
      ADD COLUMN active_chum_base_color VARCHAR(10) NOT NULL DEFAULT 'base14';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chum_wardrobe' AND column_name = 'use_chum_avatar'
  ) THEN
    ALTER TABLE public.chum_wardrobe
      ADD COLUMN use_chum_avatar BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chum_wardrobe_user_id ON public.chum_wardrobe(user_id);

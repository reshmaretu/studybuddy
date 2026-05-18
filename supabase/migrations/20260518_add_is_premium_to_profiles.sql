-- ====================================================================
-- MIGRATION: ADD IS_PREMIUM COLUMN TO PROFILES
-- Date: 2026-05-18
-- ====================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

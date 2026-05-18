-- ====================================================================
-- MIGRATION: ADD AI KEYS & RECOVERY CODES TABLE
-- ====================================================================

-- 1. Ensure profiles table has AI keys and is_verified columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS openrouter_key TEXT,
ADD COLUMN IF NOT EXISTS gemini_key TEXT,
ADD COLUMN IF NOT EXISTS groq_key TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Create recovery_codes table for secure OTP relays
CREATE TABLE IF NOT EXISTS public.recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on recovery_codes
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

-- Note: No public RLS policies are created for recovery_codes because it is 
-- strictly accessed via the Supabase Service Role key in edge functions.

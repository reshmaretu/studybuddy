-- ==============================================================
-- FIX PROFILES INFINITE RECURSION & RLS POLICIES
-- Date: 2026-05-18
-- Purpose: Resolve infinite recursion error (42P17) when updating profiles
-- by eliminating recursive queries in helper functions and dropping all old conflicting policies.
-- ==============================================================

-- 1. Replace user_owns_profile helper to avoid querying public.profiles table
CREATE OR REPLACE FUNCTION public.user_owns_profile(profile_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_uuid = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_profile(uuid) TO authenticated;

-- 2. Drop all potential conflicting RLS policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- 3. Recreate clean, direct, non-recursive RLS policies
CREATE POLICY "Profiles are viewable by all users"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ==============================================================
-- FIX PROFILES RLS POLICIES - ALLOW VIEWING ALL PROFILES
-- Date: 2026-05-15
-- Purpose: Allow users to see profile data of other users
-- This is why feeds were showing "Anonymous"
-- ==============================================================

-- Drop restrictive RLS policies on profiles that block viewing other users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create new policy: Allow viewing ALL profiles (no restrictions)
CREATE POLICY "Profiles are viewable by all users"
  ON public.profiles FOR SELECT
  USING (true);  -- Allow any authenticated user to view any profile

-- Create policy: Users can update only their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy: Users can insert (create) their own profile
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==============================================================
-- SUMMARY
-- ==============================================================
/*
ROOT CAUSE IDENTIFIED:
- synthetic_logs HAS user_id (no need for profile_id column)
- The join works: `JOIN profiles p ON sl.user_id = p.id`
- BUT: RLS policy on profiles was blocking visibility of OTHER users' profiles
- RESULT: Joins returned NULL, showing "Anonymous" everywhere

FIX:
- New policy allows viewing ALL profiles
- No column changes needed
- No triggers needed
- Just RLS policy update

EXPECTED RESULTS:
✅ Synthetic feeds show display_name + avatar_url
✅ Friends list shows names instead of "unknown"
✅ Rooms show host/guest names
✅ Pacts show member names
✅ All chum avatars appear
✅ Spark buttons visible
*/

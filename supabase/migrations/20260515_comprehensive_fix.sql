-- ==============================================================
-- COMPREHENSIVE FIX: RLS + DIRECT QUERIES + RPC FUNCTIONS
-- Date: 2026-05-15
-- ==============================================================

-- PHASE 1: Fix RLS policies to allow profile visibility
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- PHASE 2: Fix synthetic_logs RLS to allow viewing all broadcasts
DROP POLICY IF EXISTS "Authenticated users can view synthetic logs" ON public.synthetic_logs;
DROP POLICY IF EXISTS "Users can insert their own synthetic logs" ON public.synthetic_logs;

CREATE POLICY "View all broadcasts"
  ON public.synthetic_logs FOR SELECT
  USING (true);

CREATE POLICY "Insert own broadcasts"
  ON public.synthetic_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- PHASE 3: Fix user_friendships RLS
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.user_friendships;

CREATE POLICY "View friendships"
  ON public.user_friendships FOR SELECT
  USING (true);

-- PHASE 4: Create RPC for broadcasts with proper structure matching frontend
CREATE OR REPLACE FUNCTION public.get_broadcasts_feed(limit_num int DEFAULT 50, offset_num int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  broadcast_type varchar,
  reactions_count int,
  created_at timestamp with time zone,
  metadata jsonb,
  profiles jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  sl.id,
  sl.user_id,
  sl.content,
  sl.broadcast_type,
  sl.reactions_count,
  sl.created_at,
  sl.metadata,
  jsonb_build_object(
    'id', p.id,
    'display_name', COALESCE(p.display_name, 'Anonymous Broadcaster'),
    'avatar_url', p.avatar_url,
    'full_name', p.full_name,
    'status', p.status
  ) as profiles
FROM public.synthetic_logs sl
LEFT JOIN public.profiles p ON sl.user_id = p.id
ORDER BY sl.created_at DESC
LIMIT limit_num
OFFSET offset_num;
$$;

GRANT EXECUTE ON FUNCTION public.get_broadcasts_feed(int, int) TO authenticated;

-- PHASE 5: Create RPC for friends with profile data
CREATE OR REPLACE FUNCTION public.get_user_friends_with_profiles()
RETURNS TABLE (
  id uuid,
  user_id_1 uuid,
  user_id_2 uuid,
  status text,
  profiles_1 jsonb,
  profiles_2 jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  uf.id,
  uf.user_id_1,
  uf.user_id_2,
  uf.status,
  jsonb_build_object(
    'id', p1.id,
    'display_name', COALESCE(p1.display_name, 'Unknown'),
    'avatar_url', p1.avatar_url,
    'full_name', p1.full_name,
    'status', p1.status
  ),
  jsonb_build_object(
    'id', p2.id,
    'display_name', COALESCE(p2.display_name, 'Unknown'),
    'avatar_url', p2.avatar_url,
    'full_name', p2.full_name,
    'status', p2.status
  )
FROM public.user_friendships uf
LEFT JOIN public.profiles p1 ON uf.user_id_1 = p1.id
LEFT JOIN public.profiles p2 ON uf.user_id_2 = p2.id
WHERE (uf.user_id_1 = auth.uid() OR uf.user_id_2 = auth.uid())
  AND uf.status = 'accepted';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_friends_with_profiles() TO authenticated;

-- PHASE 6: Create RPC for pacts with member profiles
DROP FUNCTION IF EXISTS public.get_user_pacts_with_members();

CREATE OR REPLACE FUNCTION public.get_user_pacts_with_members()
RETURNS TABLE (
  id uuid,
  created_by uuid,
  created_at timestamp with time zone,
  pact_name text,
  constellation_color text,
  pact_members jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  p.id,
  p.created_by,
  p.created_at,
  p.pact_name,
  p.constellation_color,
  jsonb_agg(
    jsonb_build_object(
      'user_id', pm.user_id,
      'display_name', COALESCE(pr.display_name, 'Unknown Member'),
      'avatar_url', pr.avatar_url,
      'status', pr.status
    )
  ) as pact_members
FROM public.pacts p
LEFT JOIN public.pact_members pm ON p.id = pm.pact_id
LEFT JOIN public.profiles pr ON pm.user_id = pr.id
WHERE EXISTS (
  SELECT 1 FROM public.pact_members
  WHERE pact_id = p.id AND user_id = auth.uid()
)
GROUP BY p.id, p.created_by, p.created_at, p.pact_name, p.constellation_color;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_pacts_with_members() TO authenticated;

-- PHASE 7: Enable RLS on all social tables
ALTER TABLE public.synthetic_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pact_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- SUMMARY
-- ==============================================================
/*
ROOT CAUSE #1: RLS policies on profiles blocked viewing other users
ROOT CAUSE #2: RPC functions either don't exist or return wrong format
ROOT CAUSE #3: Frontend expects nested profile data in objects

FIXES:
✅ RLS: Allow viewing all profiles (public social platform)
✅ RLS: Allow viewing all broadcasts (public feeds)
✅ RPC: get_broadcasts_feed() returns profiles as JSONB object (matches frontend)
✅ RPC: get_user_friends_with_profiles() returns friends with profile data
✅ RPC: get_user_pacts_with_members() returns pacts with member profiles

EXPECTED RESULTS:
✅ Synthetic feeds show display_name + avatar_url
✅ Friends list shows names instead of "unknown"  
✅ Rooms show host/guest names
✅ Pacts show member names
✅ All chum avatars appear
✅ Spark buttons visible
*/

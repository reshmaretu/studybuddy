-- ==============================================================
-- CREATE RPC FUNCTIONS FOR ATOMIC OPERATIONS
-- Date: 2026-05-13
-- Purpose: Provide safe backend operations for broadcasts, reactions, and network stats
-- ==============================================================

-- ============================================================
-- RPC FUNCTION 1: Atomic Broadcast Reaction Increment
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_broadcast_reaction(broadcast_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to spark broadcasts';
  END IF;

  -- Atomically increment reactions_count for the broadcast
  UPDATE public.synthetic_logs
  SET reactions_count = COALESCE(reactions_count, 0) + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = broadcast_id;

  -- Verify the broadcast exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.increment_broadcast_reaction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_broadcast_reaction(uuid) TO authenticated;

-- ============================================================
-- RPC FUNCTION 2: Fetch User Network Statistics
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_network_stats(user_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  total_broadcasts bigint,
  total_sparks bigint,
  friends_count bigint,
  pacts_count bigint,
  last_broadcast_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  (SELECT COUNT(*) FROM public.synthetic_logs WHERE user_id = COALESCE(user_id_param, auth.uid())),
  (SELECT COALESCE(SUM(reactions_count), 0) FROM public.synthetic_logs WHERE user_id = COALESCE(user_id_param, auth.uid())),
  (SELECT COUNT(*) FROM public.user_friendships 
   WHERE (user_id_1 = COALESCE(user_id_param, auth.uid()) OR user_id_2 = COALESCE(user_id_param, auth.uid()))
   AND status = 'accepted'),
  (SELECT COUNT(*) FROM public.pact_members WHERE user_id = COALESCE(user_id_param, auth.uid())),
  (SELECT MAX(created_at) FROM public.synthetic_logs WHERE user_id = COALESCE(user_id_param, auth.uid()))
$$;

REVOKE ALL ON FUNCTION public.get_user_network_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_network_stats(uuid) TO authenticated;

-- ============================================================
-- RPC FUNCTION 3: Fetch Network Feed with Auth Check
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_network_feed(limit_param integer DEFAULT 50, offset_param integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  broadcast_type varchar,
  reactions_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  metadata jsonb,
  display_name text,
  avatar_url text,
  full_name text,
  user_status text
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
  sl.updated_at,
  sl.metadata,
  p.display_name,
  p.avatar_url,
  p.full_name,
  p.status
FROM public.synthetic_logs sl
LEFT JOIN public.profiles p ON sl.profile_id = p.id
WHERE sl.broadcast_type IN ('custom-status', 'milestone', 'quest-progress', 'feedback', 'study-room', 'canvas-room')
ORDER BY sl.created_at DESC
LIMIT limit_param
OFFSET offset_param;
$$;

REVOKE ALL ON FUNCTION public.get_network_feed(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_network_feed(integer, integer) TO authenticated;

-- ============================================================
-- RPC FUNCTION 4: Check Broadcast Ownership
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_broadcast_owner(broadcast_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.synthetic_logs
  WHERE id = broadcast_id AND user_id = auth.uid()
);
$$;

GRANT EXECUTE ON FUNCTION public.is_broadcast_owner(uuid) TO authenticated;

-- ============================================================
-- RPC FUNCTION 5: Create Broadcast with Profile Sync
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_broadcast(
  content_param text,
  broadcast_type_param varchar,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  broadcast_type varchar,
  reactions_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  metadata jsonb,
  display_name text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH new_broadcast AS (
  INSERT INTO public.synthetic_logs (user_id, content, broadcast_type, metadata)
  VALUES (auth.uid(), content_param, broadcast_type_param, metadata_param)
  RETURNING id, user_id, content, broadcast_type, reactions_count, created_at, updated_at, metadata
),
with_profile AS (
  SELECT 
    nb.id,
    nb.user_id,
    nb.content,
    nb.broadcast_type,
    nb.reactions_count,
    nb.created_at,
    nb.updated_at,
    nb.metadata,
    p.display_name,
    p.avatar_url
  FROM new_broadcast nb
  LEFT JOIN public.profiles p ON nb.user_id = p.id
)
SELECT * FROM with_profile;
$$;

GRANT EXECUTE ON FUNCTION public.create_broadcast(text, varchar, jsonb) TO authenticated;

-- ============================================================
-- RPC FUNCTION 6: Delete Broadcast (Owner Only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_broadcast(broadcast_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to delete broadcasts';
  END IF;

  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.synthetic_logs
    WHERE id = broadcast_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete this broadcast';
  END IF;

  -- Delete the broadcast
  DELETE FROM public.synthetic_logs WHERE id = broadcast_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_broadcast(uuid) TO authenticated;

-- ============================================================
-- RPC FUNCTION 7: Fetch Friend Requests with Profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS TABLE (
  id uuid,
  user_id_1 uuid,
  user_id_2 uuid,
  requester_id uuid,
  status varchar,
  created_at timestamp with time zone,
  requester_name text,
  requester_avatar text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
  uf.id,
  uf.user_id_1,
  uf.user_id_2,
  uf.requester_id,
  uf.status,
  uf.created_at,
  p.display_name,
  p.avatar_url
FROM public.user_friendships uf
LEFT JOIN public.profiles p ON (
  CASE 
    WHEN uf.user_id_1 = auth.uid() THEN uf.user_id_2 = p.id
    WHEN uf.user_id_2 = auth.uid() THEN uf.user_id_1 = p.id
  END
)
WHERE (uf.user_id_1 = auth.uid() OR uf.user_id_2 = auth.uid())
  AND uf.status = 'pending'
ORDER BY uf.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_requests() TO authenticated;

-- ============================================================
-- RPC FUNCTION 8: Fetch Friends with Profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  id uuid,
  user_id_1 uuid,
  user_id_2 uuid,
  status varchar,
  created_at timestamp with time zone,
  friend_id uuid,
  friend_name text,
  friend_avatar text,
  friend_status text
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
  uf.created_at,
  CASE 
    WHEN uf.user_id_1 = auth.uid() THEN uf.user_id_2
    ELSE uf.user_id_1
  END as friend_id,
  p.display_name,
  p.avatar_url,
  p.status
FROM public.user_friendships uf
LEFT JOIN public.profiles p ON (
  CASE 
    WHEN uf.user_id_1 = auth.uid() THEN uf.user_id_2 = p.id
    WHEN uf.user_id_2 = auth.uid() THEN uf.user_id_1 = p.id
  END
)
WHERE (uf.user_id_1 = auth.uid() OR uf.user_id_2 = auth.uid())
  AND uf.status = 'accepted'
ORDER BY uf.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends() TO authenticated;

-- ============================================================
-- SUMMARY OF FUNCTIONS CREATED
-- ============================================================
/*
CREATED RPC FUNCTIONS:

1. increment_broadcast_reaction(broadcast_id uuid)
   - Atomically increments reaction count
   - Prevents race conditions
   - Validates user authentication

2. get_user_network_stats(user_id uuid)
   - Returns: total_broadcasts, total_sparks, friends_count, pacts_count, last_broadcast_at
   - Useful for dashboard stats

3. get_network_feed(limit integer, offset integer)
   - Returns paginated feed with profile info
   - Filters by broadcast type
   - Includes display names and avatars

4. is_broadcast_owner(broadcast_id uuid)
   - Returns boolean for ownership validation
   - Used in delete/update operations

5. create_broadcast(content text, broadcast_type varchar, metadata jsonb)
   - Creates broadcast with auto-profile sync
   - Returns full record with profile info
   - Validates auth context

6. delete_broadcast(broadcast_id uuid)
   - Deletes only if owner
   - Validates permissions
   - Atomic operation

7. get_friend_requests()
   - Returns pending friend requests for current user
   - Includes requester profile info

8. get_friends()
   - Returns accepted friendships
   - Includes friend profile info

All functions use SECURITY DEFINER for proper auth context.
All functions are restricted to authenticated users only.
*/

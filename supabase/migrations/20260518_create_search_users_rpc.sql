-- CREATE RPC FUNCTION FOR USER SEARCH WITH SECURITY DEFINER TO BYPASS RLS
-- This function allows searching user profiles by display_name or full_name, excluding the current user.

CREATE OR REPLACE FUNCTION search_users(search_query text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    display_name text,
    full_name text,
    avatar_url text,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.display_name, 
        p.full_name, 
        p.avatar_url, 
        p.status
    FROM profiles p
    WHERE (p.display_name ILIKE '%' || search_query || '%' OR p.full_name ILIKE '%' || search_query || '%')
    AND (current_user_id IS NULL OR p.id != current_user_id)
    LIMIT 20;
END;
$$;

-- Grant execute permission to public, anon, and authenticated roles
GRANT EXECUTE ON FUNCTION search_users(text, uuid) TO public;
GRANT EXECUTE ON FUNCTION search_users(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION search_users(text, uuid) TO authenticated;

-- Fix pact constellation rendering issues
-- Ensures constellation_color is always populated and pact_members returns proper array

-- PHASE 1: Ensure constellation_color is never null
ALTER TABLE public.pacts 
ALTER COLUMN constellation_color SET NOT NULL,
ALTER COLUMN constellation_color SET DEFAULT '#2dd4bf';

-- Update any existing null constellation_color values
UPDATE public.pacts 
SET constellation_color = '#2dd4bf' 
WHERE constellation_color IS NULL;

-- PHASE 2: Fix RPC to return empty array instead of null for pact_members
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
  COALESCE(p.constellation_color, '#2dd4bf') as constellation_color,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id', pm.user_id,
        'display_name', COALESCE(pr.display_name, 'Unknown Member'),
        'avatar_url', pr.avatar_url,
        'status', pr.status
      )
    ) FILTER (WHERE pm.user_id IS NOT NULL),
    '[]'::jsonb
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

-- PHASE 3: Create trigger to auto-generate constellation_color on pact creation
DROP TRIGGER IF EXISTS trigger_generate_pact_color ON public.pacts;

CREATE OR REPLACE FUNCTION public.generate_pact_constellation_color()
RETURNS TRIGGER AS $$
DECLARE
    colors text[] := ARRAY['#FF1493', '#00CED1', '#32CD32', '#FFD700', '#FF8C00', '#9370DB', '#20B2AA', '#FF6347'];
    random_index int;
BEGIN
    IF NEW.constellation_color IS NULL OR NEW.constellation_color = '' THEN
        random_index := floor(random() * array_length(colors, 1)) + 1;
        NEW.constellation_color := colors[random_index];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_pact_color
BEFORE INSERT ON public.pacts
FOR EACH ROW
EXECUTE FUNCTION public.generate_pact_constellation_color();

-- SUMMARY
/*
✅ Ensures constellation_color is always NOT NULL with default '#2dd4bf'
✅ Updates existing null values to default color
✅ RPC returns empty array instead of null when no members
✅ RPC includes COALESCE for constellation_color safety
✅ Trigger auto-generates color if not provided during pact creation
✅ Uses diverse color palette for visual variety
*/

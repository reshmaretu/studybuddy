import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search for users (include self for "You" label)
    let { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, status')
      .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    const results = (data || []).map((profile) =>
      profile.id === user.id
        ? { ...profile, display_name: profile.display_name || profile.full_name || 'You', isSelf: true }
        : { ...profile, isSelf: false }
    );

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

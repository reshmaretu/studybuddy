import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

type ReadNotificationsBody = {
  category?: 'activity' | 'system';
  ids?: string[];
};

// POST /api/notifications/read - Mark notifications as read (bulk)
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: ReadNotificationsBody = {};
    try {
      body = (await req.json()) as ReadNotificationsBody;
    } catch {
      body = {};
    }

    const { category, ids } = body;

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    } else if (category === 'activity' || category === 'system') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;

    return NextResponse.json({ updated: data?.length || 0 }, { status: 200 });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}

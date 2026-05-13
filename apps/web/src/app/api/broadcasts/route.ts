import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, broadcastType = 'custom-status', metadata = {} } = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('synthetic_logs')
      .insert([{
        user_id: user.id,
        content: content.trim(),
        broadcast_type: broadcastType,
        metadata: metadata,
        created_at: new Date().toISOString(),
        reactions_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { broadcastId } = await req.json();
    if (!broadcastId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Use the RPC function for atomic, secure increment
    const { error } = await supabase.rpc('spark_broadcast', { log_id: broadcastId });

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Spark error:', error);
    return NextResponse.json({ error: 'Failed to spark' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error } = await supabase
      .from('synthetic_logs')
      .select(
        'id, user_id, content, broadcast_type, metadata, created_at, reactions_count'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const logs = data ?? [];
    const userIds = [...new Set(logs.map((log) => log.user_id))];
    let profilesById: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          display_name, 
          full_name, 
          avatar_url, 
          status,
          chum_wardrobe (
            active_accessories,
            active_chum_base_color
          )
        `)
        .in('id', userIds);

      if (profilesError) throw profilesError;

      profilesById = Object.fromEntries(
        (profiles ?? []).map((profile) => [profile.id, profile])
      );
    }

    const enriched = logs.map((log) => ({
      ...log,
      profiles: profilesById[log.user_id] ?? null,
    }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('Fetch broadcasts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}


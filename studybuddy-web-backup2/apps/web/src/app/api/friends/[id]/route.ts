import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// PATCH /api/friends/[id] - Accept/reject friend request or remove friend
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const { data: friendship, error: fetchError } = await supabase
      .from('user_friendships')
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    const requesterId = friendship.requester_id || friendship.user_id_1;
    const recipientId = friendship.user_id_1 === requesterId
      ? friendship.user_id_2
      : friendship.user_id_1;

    if (action === 'accept') {
      if (friendship.status !== 'pending') {
        return NextResponse.json({ error: 'Request already handled' }, { status: 409 });
      }

      if (recipientId !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const { data, error } = await supabase
        .from('user_friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add notification to requester
      await supabase.from('notifications').insert([{
        user_id: requesterId,
        title: 'Friend Request Accepted',
        message: 'Your friend request was accepted',
        type: 'friend_accepted',
        related_user_id: user.id,
      }]);

      return NextResponse.json(data, { status: 200 });
    } else if (action === 'reject') {
      if (friendship.status !== 'pending') {
        return NextResponse.json({ error: 'Request already handled' }, { status: 409 });
      }

      if (recipientId !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const { error } = await supabase
        .from('user_friendships')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true }, { status: 200 });
    } else if (action === 'remove') {
      // Either user can remove
      if (friendship.user_id_1 !== user.id && friendship.user_id_2 !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const { error } = await supabase
        .from('user_friendships')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update friendship error:', error);
    return NextResponse.json(
      { error: 'Failed to update friendship' },
      { status: 500 }
    );
  }
}

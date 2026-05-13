import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// PATCH /api/pacts/[id] - Add members (owner only)
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

    const { memberIds } = await req.json();
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'memberIds array is required' }, { status: 400 });
    }

    const { data: pact, error: pactError } = await supabase
      .from('pacts')
      .select('id, pact_name, created_by')
      .eq('id', id)
      .single();

    if (pactError || !pact) {
      return NextResponse.json({ error: 'Pact not found' }, { status: 404 });
    }

    if (pact.created_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const validIds = memberIds.filter((memberId: string) => /^[0-9a-fA-F-]{36}$/.test(memberId));
    const uniqueIds = [...new Set(validIds)].filter((memberId) => memberId !== user.id);

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: 'No valid members to add' }, { status: 400 });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('pact_members')
      .select('user_id')
      .eq('pact_id', id)
      .in('user_id', uniqueIds);

    if (existingError) throw existingError;

    const existingIds = new Set((existingRows || []).map((row) => row.user_id));
    const newIds = uniqueIds.filter((memberId) => !existingIds.has(memberId));

    if (newIds.length === 0) {
      return NextResponse.json({ error: 'All selected users are already members' }, { status: 400 });
    }

    const memberRecords = newIds.map((memberId) => ({
      pact_id: id,
      user_id: memberId,
      joined_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('pact_members')
      .insert(memberRecords);

    if (insertError) throw insertError;

    await Promise.all(newIds.map(async (memberId) => {
      const { error: notifyError } = await supabase.from('notifications').insert([{
        user_id: memberId,
        title: 'Pact Invitation',
        message: `You've been added to a pact: ${pact.pact_name}`,
        type: 'pact_invitation',
        related_user_id: user.id,
        related_pact_id: pact.id,
      }]);
      if (notifyError) {
        console.warn('Pact notification failed:', notifyError);
      }
    }));

    return NextResponse.json({ success: true, added: newIds.length }, { status: 200 });
  } catch (error) {
    console.error('Add pact members error:', error);
    return NextResponse.json(
      { error: 'Failed to add pact members' },
      { status: 500 }
    );
  }
}

// DELETE /api/pacts/[id] - Leave pact
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'delete') {
      const { data: pact, error: pactError } = await supabase
        .from('pacts')
        .select('id, created_by')
        .eq('id', id)
        .single();

      if (pactError || !pact) {
        return NextResponse.json({ error: 'Pact not found' }, { status: 404 });
      }

      if (pact.created_by !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('pacts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Check if user is member
    const { data: member, error: memberError } = await supabase
      .from('pact_members')
      .select()
      .eq('pact_id', id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Not a member of this pact' }, { status: 403 });
    }

    // Remove user from pact
    const { error } = await supabase
      .from('pact_members')
      .delete()
      .eq('pact_id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Check if pact is now empty
    const { data: remainingMembers } = await supabase
      .from('pact_members')
      .select()
      .eq('pact_id', id);

    // If no members left, delete the pact
    if (!remainingMembers || remainingMembers.length === 0) {
      await supabase.from('pacts').delete().eq('id', id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Leave pact error:', error);
    return NextResponse.json(
      { error: 'Failed to leave pact' },
      { status: 500 }
    );
  }
}

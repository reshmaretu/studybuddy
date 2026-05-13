import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// POST /api/pacts - Create a new pact
export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const { supabase, user } = await getRouteSupabase(req);
    userId = user?.id ?? null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pactName, memberIds } = await req.json();

    if (!pactName || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'pactName and memberIds array are required' },
        { status: 400 }
      );
    }

    const validIds = Array.isArray(memberIds)
      ? memberIds.filter((id: string) => /^[0-9a-fA-F-]{36}$/.test(id))
      : [];

    // Ensure creator is included
    if (!validIds.includes(user.id)) {
      validIds.push(user.id);
    }

    // Remove duplicates
    const uniqueMembers = [...new Set(validIds)];

    if (uniqueMembers.length < 2) {
      return NextResponse.json(
        { error: 'Pact must have at least 2 members' },
        { status: 400 }
      );
    }

    // Generate random constellation color (hex) - properly padded to 6 chars
    const randomHex = Math.floor(Math.random()*16777215).toString(16);
    const constellationColor = '#' + randomHex.padStart(6, '0');

    // Create pact
    const { data: pact, error: pactError } = await supabase
      .from('pacts')
      .insert([{
        pact_name: pactName,
        created_by: user.id,
        constellation_color: constellationColor,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (pactError) throw pactError;

    // Add members to pact
    const memberRecords = uniqueMembers.map(userId => ({
      pact_id: pact.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
    }));

    const { error: membersError } = await supabase
      .from('pact_members')
      .insert(memberRecords);

    if (membersError) throw membersError;

    // Notify members
    await Promise.all(uniqueMembers.map(async (memberId) => {
      if (memberId === user.id) return;
      const { error: notifyError } = await supabase.from('notifications').insert([{
        user_id: memberId,
        title: 'Pact Invitation',
        message: `You've been invited to join a pact: ${pactName}`,
        type: 'pact_invitation',
        related_user_id: user.id,
        related_pact_id: pact.id,
      }]);
      if (notifyError) {
        console.warn('Pact notification failed:', notifyError);
      }
    }));

    return NextResponse.json({
      ...pact,
      members: uniqueMembers,
    }, { status: 201 });
  } catch (error) {
    const detail = (() => {
      if (error instanceof Error) return { message: error.message };
      if (error && typeof error === 'object') {
        const err = error as { message?: string; code?: string; details?: string; hint?: string };
        return {
          message: err.message || 'Unknown error',
          code: err.code,
          details: err.details,
          hint: err.hint,
        };
      }
      return { message: String(error) };
    })();

    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const context = {
      userId,
      authHeaderPresent: Boolean(authHeader),
    };

    console.error('Create pact error:', detail);
    return NextResponse.json(
      { error: 'Failed to create pact', detail, context },
      { status: 500 }
    );
  }
}

// GET /api/pacts - Get user's pacts
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pact_members')
      .select(`
        pact_id,
        pacts(
          id,
          pact_name,
          created_by,
          constellation_color,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    // Extract unique pacts and get member details for each
    const pactIds = [...new Set((data || []).map(pm => pm.pact_id))];
    
    const pacts = await Promise.all(
      pactIds.map(async (pactId) => {
        const { data: memberRows } = await supabase
          .from('pact_members')
          .select('user_id, joined_at')
          .eq('pact_id', pactId);

        const userIds = Array.from(new Set((memberRows || []).map((row) => row.user_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, status')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
        const members = userIds.map((id) => {
          const profile = profileMap.get(id);
          return {
            id,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            status: profile?.status ?? null,
          };
        });

        const pactData = data?.find(pm => pm.pact_id === pactId)?.pacts;
        return {
          ...pactData,
          members,
        };
      })
    );

    return NextResponse.json(pacts, { status: 200 });
  } catch (error) {
    console.error('Get pacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pacts' },
      { status: 500 }
    );
  }
}

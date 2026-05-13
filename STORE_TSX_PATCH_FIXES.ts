// STORE.TSX PATCH - Frontend Fix for Synthetic Logs
// File: packages/api/store.tsx
// Lines: 1607-1650 (approximately)

// ============================================================
// FIXED: addBroadcast method
// ============================================================
addBroadcast: async (content, broadcastType = 'custom-status', metadata = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        get().addToOfflineQueue('addBroadcast', { content, type: broadcastType, metadata });
        get().triggerChumToast?.('Offline: Broadcast queued for sync.', 'info');
        return;
    }

    const { data, error } = await supabase
        .from('synthetic_logs')
        .insert([{ 
            user_id: user.id, 
            content, 
            broadcast_type: broadcastType,
            metadata 
        }])
        // ✅ FIXED: Properly join using the new profile_id foreign key
        // Also fetch user profile info
        .select(`
            *,
            profile:profile_id (
                id,
                display_name,
                avatar_url,
                full_name,
                status
            )
        `)
        .single();

    if (error) {
        console.error("Add broadcast error:", error);
        get().addToOfflineQueue('addBroadcast', { content, type: broadcastType, metadata });
        return;
    }

    // ✅ FIXED: Transform the response to match expected structure
    const broadcastWithProfile = {
        ...data,
        display_name: data.profile?.display_name || user.email?.split('@')[0] || 'Broadcaster',
        avatar_url: data.profile?.avatar_url,
        full_name: data.profile?.full_name
    };

    set((state) => ({ broadcasts: [broadcastWithProfile, ...state.broadcasts] }));
    get().triggerChumToast?.('Your message has been shared with the network!', 'success');
},

// ============================================================
// FIXED: fetchBroadcasts method
// ============================================================
fetchBroadcasts: async (limit = 50, offset = 0) => {
    // ✅ FIXED: Properly join using the new profile_id foreign key
    const { data, error } = await supabase
        .from('synthetic_logs')
        .select(`
            *,
            profile:profile_id (
                id,
                display_name,
                avatar_url,
                full_name,
                status
            )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Fetch broadcasts error:", error);
        return;
    }

    // ✅ FIXED: Transform response to ensure profile data is accessible
    const broadcasWithProfiles = (data || []).map(broadcast => ({
        ...broadcast,
        display_name: broadcast.profile?.display_name || 'Anonymous Broadcaster',
        avatar_url: broadcast.profile?.avatar_url,
        full_name: broadcast.profile?.full_name,
        user_status: broadcast.profile?.status
    }));

    console.log("Fetched broadcasts:", broadcasWithProfiles?.length, "with profiles:", broadcasWithProfiles);
    
    set((state) => ({ 
        broadcasts: offset === 0 
            ? broadcasWithProfiles 
            : [...state.broadcasts, ...broadcasWithProfiles] 
    }));
},

// ============================================================
// NOTE: sparkBroadcast already handles RPC call properly
// No changes needed there, but verify the RPC function exists:
// ============================================================
// CREATE OR REPLACE FUNCTION public.increment_broadcast_reaction(broadcast_id uuid)
// RETURNS void AS $$
// BEGIN
//   UPDATE public.synthetic_logs
//   SET reactions_count = reactions_count + 1
//   WHERE id = broadcast_id;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

sparkBroadcast: async (broadcastId: string) => {
    // Optimistic update
    set((state) => ({
        broadcasts: state.broadcasts.map((b) =>
            b.id === broadcastId ? { ...b, reactions_count: (b.reactions_count || 0) + 1 } : b
        )
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn("Cannot spark broadcast: user not authenticated");
        return;
    }

    // We use an RPC call for atomic increment to avoid race conditions
    const { error } = await supabase.rpc('increment_broadcast_reaction', { broadcast_id: broadcastId });
    if (error) {
        console.error("Spark error:", error);
        // Revert optimistic update on error
        set((state) => ({
            broadcasts: state.broadcasts.map((b) =>
                b.id === broadcastId ? { ...b, reactions_count: Math.max(0, (b.reactions_count || 1) - 1) } : b
            )
        }));
    } else {
        get().triggerChumToast?.('✨ Sparked!', 'success');
    }
},

// ============================================================
// VERIFY: These methods still work but may need profile updates:
// ============================================================

// Make sure sendFriendRequest includes profile info for UI:
sendFriendRequest: async (targetUserId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn("Cannot send friend request: user not authenticated");
        return;
    }

    const user_id_1 = user.id < targetUserId ? user.id : targetUserId;
    const user_id_2 = user.id < targetUserId ? targetUserId : user.id;

    const { data, error } = await supabase
        .from('user_friendships')
        .insert([{ 
            user_id_1, 
            user_id_2, 
            status: 'pending',
            requester_id: user.id  // ✅ Track who requested
        }])
        // ✅ Include profile info for both users
        .select(`
            *,
            profiles_1:user_id_1 (
                id,
                display_name,
                avatar_url
            ),
            profiles_2:user_id_2 (
                id,
                display_name,
                avatar_url
            )
        `);

    if (error) {
        console.error("Friend request error:", error);
        get().triggerChumToast?.('Failed to send friend request', 'error');
        return;
    }

    get().triggerChumToast?.('Friend request sent!', 'success');
},

// ============================================================
// HELPER FUNCTION: Safely fetch user profile with fallback
// ============================================================
getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.warn(`Could not fetch profile for user ${userId}:`, error);
        return null;
    }
    return data;
},

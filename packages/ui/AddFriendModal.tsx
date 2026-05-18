'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { getAuthHeaders, useStudyStore, supabase, getApiUrl } from '@studybuddy/api';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, Search, X, Check, Star, UserMinus, Plus } from 'lucide-react';
import { Button } from './Button';
import { SquishyButton } from './SquishyButton';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JumpingDots: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-4 my-auto">
    <div className="flex items-center justify-center gap-2.5">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-3.5 h-3.5 rounded-full bg-[var(--accent-teal)] shadow-[0_0_15px_var(--accent-teal)]"
          animate={{ y: [0, -12, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
    {label && <span className="text-xs font-bold text-(--text-muted) uppercase tracking-widest animate-pulse">{label}</span>}
  </div>
);

const renderUserDisplayName = (user: { id?: string; display_name?: string; full_name?: string }, currentUserId?: string | null) => {
  const hasDisplayName = user?.display_name && user.display_name.trim();
  const hasFullName = user?.full_name && user.full_name.trim();
  const isSelf = user.id === currentUserId;
  let nameStr = 'Unknown User';

  if (hasDisplayName) {
    nameStr = hasFullName ? `${user.display_name || ''} @(${user.full_name || ''})` : (user.display_name || 'Unknown User');
  } else if (hasFullName) {
    nameStr = `@[${user.full_name || ''}]`;
  }

  return isSelf ? `${nameStr} (You)` : nameStr;
};

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const { 
    friendRequests, fetchFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend,
    friends, fetchFriends, sendFriendRequest 
  } = useStudyStore();

  const [activeTab, setActiveTab] = useState<'add' | 'requests' | 'friends' | 'pacts'>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requestedUsers, setRequestedUsers] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<Set<string>>(new Set());
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());

  // Pact states
  const [pacts, setPacts] = useState<any[]>([]);
  const [isPactsLoading, setIsPactsLoading] = useState(false);
  const [isCreatePactModalOpen, setIsCreatePactModalOpen] = useState(false);
  const [newPactName, setNewPactName] = useState('');
  const [selectedFriendsForPact, setSelectedFriendsForPact] = useState<Set<string>>(new Set());

  const fetchPacts = useCallback(async () => {
    setIsPactsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_pacts_with_members');
      if (error) throw error;
      setPacts(data || []);
    } catch (e) {
      console.error('Failed to load pacts:', e);
    } finally {
      setIsPactsLoading(false);
    }
  }, []);

  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const hydrateStatuses = useCallback(async () => {
    try {
      const [{ data: authData }, authHeaders] = await Promise.all([
        supabase.auth.getUser(),
        getAuthHeaders(),
      ]);
      const currentUserId = authData.user?.id;
      if (currentUserId) setCurrentUserId(currentUserId);
      if (!currentUserId || !authHeaders.Authorization) return;

      const [requestedRes, pendingRes, friendsRes] = await Promise.all([
        fetch(getApiUrl('/api/friends?type=requested'), { headers: authHeaders }),
        fetch(getApiUrl('/api/friends?type=pending'), { headers: authHeaders }),
        fetch(getApiUrl('/api/friends?type=friends'), { headers: authHeaders }),
      ]);

      const [requestedData, pendingData, friendsData] = await Promise.all([
        requestedRes.ok ? requestedRes.json() : Promise.resolve([]),
        pendingRes.ok ? pendingRes.json() : Promise.resolve([]),
        friendsRes.ok ? friendsRes.json() : Promise.resolve([]),
      ]);

      const toOtherId = (friendship: any) =>
        friendship.user_id_1 === currentUserId ? friendship.user_id_2 : friendship.user_id_1;

      setRequestedUsers(new Set((requestedData || []).map(toOtherId)));
      setIncomingRequests(new Set((pendingData || []).map(toOtherId)));
      setFriendsSet(new Set((friendsData || []).map(toOtherId)));
    } catch (error) {
      console.error('Failed to load friend request status:', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setIsDbLoading(true);
    if (activeTab === 'add') {
      hydrateStatuses().finally(() => setIsDbLoading(false));
    } else if (activeTab === 'requests') {
      fetchFriendRequests().finally(() => setIsDbLoading(false));
    } else if (activeTab === 'friends') {
      fetchFriends().finally(() => setIsDbLoading(false));
    } else if (activeTab === 'pacts') {
      Promise.all([fetchPacts(), fetchFriends()]).finally(() => setIsDbLoading(false));
    }

    const channel = supabase.channel('add_friend_modal_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (activeTab === 'add') {
          hydrateStatuses();
          const currentQuery = searchQueryRef.current;
          if (currentQuery.trim()) {
            getAuthHeaders().then(authHeaders => {
              fetch(getApiUrl(`/api/search/users?q=${encodeURIComponent(currentQuery)}`), { headers: authHeaders })
                .then(res => res.ok ? res.json() : [])
                .then(data => setSearchResults(data))
                .catch(() => {});
            });
          }
        }
        else if (activeTab === 'requests') fetchFriendRequests();
        else if (activeTab === 'friends') fetchFriends();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_friendships' }, () => {
        if (activeTab === 'add') hydrateStatuses();
        else if (activeTab === 'requests') fetchFriendRequests();
        else if (activeTab === 'friends') fetchFriends();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacts' }, () => {
        if (activeTab === 'pacts') fetchPacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pact_members' }, () => {
        if (activeTab === 'pacts') fetchPacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, activeTab, hydrateStatuses, fetchFriendRequests, fetchFriends, fetchPacts]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/api/search/users?q=${encodeURIComponent(searchQuery)}`),
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        // Ensure data is always an array
        const results = Array.isArray(data) ? data : [];
        setSearchResults(results);
        await hydrateStatuses();
      } else {
        console.error('Search returned status:', response.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      await hydrateStatuses();
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleReject = async (friendshipId: string, displayName: string) => {
    if (confirm(`Are you sure you want to decline this request from ${displayName}?`)) {
      try {
        await rejectFriendRequest(friendshipId);
      } catch (error) {
        console.error('Failed to reject friend request:', error);
      }
    }
  };

  const handleUnfriend = async (friendshipId: string, displayName: string) => {
    if (confirm(`Are you sure you want to unfriend ${displayName}?`)) {
      try {
        await removeFriend(friendshipId);
        await fetchFriends();
      } catch (error) {
        console.error('Failed to unfriend:', error);
      }
    }
  };

  const handleCreatePact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPactName.trim() || !currentUserId) return;
    try {
      const { data: pactData, error: pactError } = await supabase
        .from('pacts')
        .insert({ pact_name: newPactName, created_by: currentUserId })
        .select('id')
        .single();
      
      if (pactError) throw pactError;

      const membersToInsert = [
        { pact_id: pactData.id, user_id: currentUserId },
        ...Array.from(selectedFriendsForPact).map(friendId => ({
          pact_id: pactData.id,
          user_id: friendId
        }))
      ];

      const { error: membersError } = await supabase
        .from('pact_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      setIsCreatePactModalOpen(false);
      setNewPactName('');
      setSelectedFriendsForPact(new Set());
      await fetchPacts();
    } catch (error) {
      console.error('Failed to create pact:', error);
      alert('Failed to create pact.');
    }
  };

  const handleDeletePact = async (pactId: string) => {
    if (!confirm('Are you sure you want to delete this pact? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('pacts').delete().eq('id', pactId);
      if (error) throw error;
      await fetchPacts();
    } catch (error) {
      console.error('Failed to delete pact:', error);
    }
  };

  const handleLeavePact = async (pactId: string) => {
    if (!confirm('Are you sure you want to leave this pact?')) return;
    try {
      const { error } = await supabase.from('pact_members').delete().match({ pact_id: pactId, user_id: currentUserId });
      if (error) throw error;
      await fetchPacts();
    } catch (error) {
      console.error('Failed to leave pact:', error);
    }
  };

  const handleRemovePactMember = async (pactId: string, memberId: string) => {
    if (!confirm('Remove this member from the pact?')) return;
    try {
      const { error } = await supabase.from('pact_members').delete().match({ pact_id: pactId, user_id: memberId });
      if (error) throw error;
      await fetchPacts();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-5 md:p-6 shadow-2xl relative z-10 w-full max-w-md flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-(--accent-teal)" />
              <h3 className="text-lg font-bold text-(--text-main)">Social Network</h3>
            </div>
            <button
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-main)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center justify-around w-full border-b border-[var(--border-color)] mb-4 shrink-0">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'add' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Add Friend
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all relative ${
                activeTab === 'requests' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Requests
              {friendRequests.length > 0 && (
                <span className="absolute -top-2 right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-md">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'friends' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('pacts')}
              className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === 'pacts' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Pacts
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[240px] max-h-[360px] flex flex-col mb-4">
            {isDbLoading && activeTab !== 'add' ? (
              <div className="flex-1 space-y-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-dark)] border border-(--border-color) animate-pulse">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-sidebar)] shrink-0" />
                      <div className="space-y-2 flex-1 max-w-[180px]">
                        <div className="h-4 bg-[var(--bg-sidebar)] rounded-md w-full" />
                        <div className="h-3 bg-[var(--bg-sidebar)] rounded-md w-2/3" />
                      </div>
                    </div>
                    <div className="w-16 h-8 bg-[var(--bg-sidebar)] rounded-xl shrink-0" />
                  </div>
                ))}
              </div>
            ) : activeTab === 'add' ? (
              <div className="space-y-4 flex-1 flex flex-col mb-2">
                <div className="flex gap-3 shrink-0 items-center">
                  <div className="relative flex-1 min-w-0">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by name..."
                      className="w-full py-3 pl-9 pr-4 rounded-2xl border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-teal)] bg-[var(--bg-dark)] text-[var(--text-main)] text-xs font-bold outline-none placeholder:text-[var(--text-muted)]/50 transition-all shadow-inner"
                      disabled={loading}
                    />
                  </div>
                  <SquishyButton
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || loading}
                    className="py-3 px-6 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] hover:brightness-110 font-black text-xs shadow-lg disabled:opacity-40 disabled:grayscale shrink-0 uppercase tracking-wider flex items-center justify-center m-0 border-none transition-all"
                  >
                    {loading ? '...' : 'Search'}
                  </SquishyButton>
                </div>

                {loading ? (
                  <div className="flex-1 space-y-3 py-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-dark)] border border-(--border-color) animate-pulse">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-sidebar)] shrink-0" />
                          <div className="space-y-2 flex-1 max-w-[180px]">
                            <div className="h-4 bg-[var(--bg-sidebar)] rounded-md w-full" />
                            <div className="h-3 bg-[var(--bg-sidebar)] rounded-md w-2/3" />
                          </div>
                        </div>
                        <div className="w-16 h-8 bg-[var(--bg-sidebar)] rounded-xl shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {searchResults.length === 0 && searchQuery && !loading && (
                      <p className="text-center py-8 text-(--text-muted) text-xs font-bold uppercase tracking-widest my-auto">
                        No users found
                      </p>
                    )}

                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-dark)] border border-(--border-color)"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name || user.full_name || 'User'}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-(--border-color)"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-(--bg-sidebar) border border-(--border-color) flex items-center justify-center text-(--text-muted) shrink-0">
                              <Users size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-(--text-main) truncate">
                              {renderUserDisplayName(user, currentUserId)}
                            </p>
                            <p className="text-xs text-(--text-muted) capitalize truncate">
                              {user.status || 'offline'}
                            </p>
                          </div>
                        </div>

                        <SquishyButton
                          onClick={() => handleSendRequest(user.id)}
                          disabled={user.id === currentUserId || requestedUsers.has(user.id) || incomingRequests.has(user.id) || friendsSet.has(user.id)}
                          className={`px-4 py-2 text-[10px] rounded-xl transition-colors flex-shrink-0 ml-2 font-black uppercase tracking-wider border-none shadow-none ${
                            user.id === currentUserId || requestedUsers.has(user.id) || incomingRequests.has(user.id) || friendsSet.has(user.id)
                              ? 'bg-[var(--bg-sidebar)] text-(--text-muted) cursor-not-allowed'
                              : 'bg-(--accent-teal) text-black hover:brightness-110 shadow-lg'
                          }`}
                        >
                          {user.id === currentUserId ? (
                            'You'
                          ) : friendsSet.has(user.id) ? (
                            'Friends'
                          ) : incomingRequests.has(user.id) ? (
                            'Pending'
                          ) : requestedUsers.has(user.id) ? (
                            <span className="inline-flex items-center gap-1"><Check size={12} /> Sent</span>
                          ) : (
                            'Add'
                          )}
                        </SquishyButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'requests' ? (
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {friendRequests.length === 0 ? (
                  <div className="text-center py-12 text-(--text-muted) text-xs font-bold uppercase tracking-widest my-auto">
                    No pending friend requests
                  </div>
                ) : (
                  friendRequests.map((request) => {
                    const profile = request.profiles_1 || request.profiles_2 || {};
                    const displayName = request.requester_name ? request.requester_name : renderUserDisplayName(profile);
                    const avatarUrl = request.requester_avatar || profile.avatar_url;
                    const isOutgoing = request.requester_id === currentUserId;

                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-dark)] border border-(--border-color) gap-2"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-(--border-color)"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-(--bg-sidebar) border border-(--border-color) flex items-center justify-center text-(--text-muted) shrink-0">
                              <Users size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-(--text-main) truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-(--text-muted) uppercase font-bold tracking-wider">
                              {isOutgoing ? 'Friend request sent' : 'Wants to link'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          {isOutgoing ? (
                            <span className="text-[10px] text-[var(--accent-teal)] font-bold uppercase tracking-wider px-3 py-2 bg-[var(--accent-teal)]/10 rounded-xl border border-[var(--accent-teal)]/20">Pending</span>
                          ) : (
                            <>
                              <SquishyButton
                                onClick={() => handleAccept(request.id)}
                                className="px-3 py-2 text-[10px] rounded-xl bg-(--accent-teal) text-black hover:brightness-110 transition-colors font-black uppercase tracking-wider border-none shadow-lg"
                              >
                                Accept
                              </SquishyButton>
                              <SquishyButton
                                onClick={() => handleReject(request.id, displayName)}
                                className="px-3 py-2 text-[10px] rounded-xl bg-[var(--bg-sidebar)] text-(--text-muted) hover:text-(--text-main) transition-colors font-black uppercase tracking-wider border-none shadow-none"
                              >
                                Reject
                              </SquishyButton>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : activeTab === 'friends' ? (
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {friends.length === 0 ? (
                  <div className="text-center py-12 text-(--text-muted) text-xs font-bold uppercase tracking-widest my-auto">
                    No active friends found
                  </div>
                ) : (
                  friends.map((friend) => {
                    const friendUser = friend.friend_data || friend.friend_profile || {};
                    const displayName = renderUserDisplayName(friendUser);
                    const avatarUrl = friendUser?.avatar_url;

                    return (
                      <div
                        key={friend.friendship_id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-dark)] border border-(--border-color) gap-2"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-(--border-color)"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-(--bg-sidebar) border border-(--border-color) flex items-center justify-center text-(--text-muted) shrink-0">
                              <Users size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-(--text-main) truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-(--text-muted) uppercase font-bold tracking-wider">{friendUser?.status || 'offline'}</p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleUnfriend(friend.friendship_id, displayName)}
                            className="px-3 py-2 text-[10px] rounded-xl bg-red-500/20 text-red-400 font-black uppercase tracking-wider border border-red-500/50 hover:bg-red-500/30 transition-colors"
                          >
                            Unfriend
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {pacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <p className="text-center text-(--text-muted) text-xs font-bold uppercase tracking-widest my-auto">
                      Not In a Pact Yet? Create one or get Invited!
                    </p>
                    <SquishyButton
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatePactModalOpen(true); }}
                      className="py-3 px-6 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] hover:brightness-110 font-black text-xs shadow-[0_0_15px_rgba(20,184,166,0.3)] shrink-0 uppercase tracking-wider flex items-center justify-center gap-2 border-none transition-all"
                    >
                      <Star size={16} /> Create Pact
                    </SquishyButton>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <SquishyButton
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreatePactModalOpen(true); }}
                        className="py-2.5 px-4 rounded-xl bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/20 font-black text-[10px] shadow-none uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[var(--accent-teal)]/30 transition-all"
                      >
                        <Plus size={14} /> New Pact
                      </SquishyButton>
                    </div>
                    {pacts.map((pact) => {
                      const isCreator = pact.created_by === currentUserId;
                      const members = Array.isArray(pact.members) ? pact.members : [];
                      
                      return (
                        <div key={pact.pact_id} className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <Star size={14} className="text-[var(--accent-yellow)]" /> {pact.pact_name}
                              </h4>
                              <p className="text-[10px] text-[var(--text-muted)] mt-1 font-bold uppercase tracking-wider">
                                {members.length} Members
                              </p>
                            </div>
                            {isCreator ? (
                              <button
                                onClick={() => handleDeletePact(pact.pact_id)}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider px-2 py-1 bg-red-500/10 rounded-lg"
                              >
                                Delete Pact
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLeavePact(pact.pact_id)}
                                className="text-[10px] text-[var(--text-muted)] hover:text-white font-bold uppercase tracking-wider px-2 py-1 bg-[var(--bg-sidebar)] rounded-lg"
                              >
                                Leave Pact
                              </button>
                            )}
                          </div>

                          <div className="space-y-2 mt-3 pt-3 border-t border-[var(--border-color)]/50">
                            {members.map((member: any) => (
                              <div key={member.id} className="flex justify-between items-center bg-[var(--bg-sidebar)] p-2 rounded-xl">
                                <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[150px]">
                                  {member.id === currentUserId ? 'You' : member.name}
                                </span>
                                {isCreator && member.id !== currentUserId && (
                                  <button
                                    onClick={() => handleRemovePactMember(pact.pact_id, member.id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove member"
                                  >
                                    <UserMinus size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 pb-2 border-t border-(--border-color) shrink-0 mt-2">
            <SquishyButton onClick={onClose} className="w-full py-3.5 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 text-xs font-extrabold transition-all shadow-none uppercase tracking-widest flex items-center justify-center m-0">
              Close
            </SquishyButton>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isCreatePactModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100010 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatePactModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.form
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onSubmit={handleCreatePact}
              className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-sm flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Star size={18} className="text-[var(--accent-teal)]" /> Create a Pact
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatePactModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Pact Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Midnight Coders"
                    value={newPactName}
                    onChange={e => setNewPactName(e.target.value)}
                    className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-[var(--accent-teal)] placeholder:text-[var(--text-muted)]/50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2 flex justify-between">
                    <span>Invite Friends</span>
                    <span className="text-[var(--accent-teal)]">{selectedFriendsForPact.size} selected</span>
                  </label>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1 border border-[var(--border-color)] rounded-xl p-2 bg-[var(--bg-dark)]">
                    {friends.length === 0 ? (
                      <div className="text-center py-4 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest">
                        No friends to invite
                      </div>
                    ) : (
                      friends.map(friend => {
                        const friendUser = friend.friend_data || friend.friend_profile || {};
                        const displayName = renderUserDisplayName(friendUser);
                        const isSelected = selectedFriendsForPact.has(friendUser.id);
                        
                        return (
                          <div key={friend.friendship_id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-sidebar)]">
                            <span className="text-xs font-bold text-white truncate flex-1">{displayName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newSet = new Set(selectedFriendsForPact);
                                if (isSelected) newSet.delete(friendUser.id);
                                else newSet.add(friendUser.id);
                                setSelectedFriendsForPact(newSet);
                              }}
                              className={`p-1.5 rounded-lg transition-colors border ${isSelected ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)] text-black' : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-white'}`}
                            >
                              {isSelected ? <Check size={14} /> : <Plus size={14} />}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <SquishyButton type="button" onClick={() => setIsCreatePactModalOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-xs font-bold transition-all shadow-none">Cancel</SquishyButton>
                <SquishyButton
                  type="submit"
                  disabled={!newPactName.trim()}
                  className="flex-1 py-3 rounded-xl bg-[var(--accent-teal)] text-black hover:brightness-110 text-xs font-black transition-all shadow-lg disabled:opacity-50"
                >
                  Create Pact
                </SquishyButton>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};


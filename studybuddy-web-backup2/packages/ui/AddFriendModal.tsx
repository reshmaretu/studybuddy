'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getAuthHeaders, useStudyStore, supabase } from '@studybuddy/api';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, X, Check } from 'lucide-react';
import { Button } from './Button';
import { SquishyButton } from './SquishyButton';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestedUsers, setRequestedUsers] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<Set<string>>(new Set());
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());
  const { sendFriendRequest } = useStudyStore();

  const hydrateStatuses = useCallback(async () => {
    try {
      const [{ data: authData }, authHeaders] = await Promise.all([
        supabase.auth.getUser(),
        getAuthHeaders(),
      ]);
      const currentUserId = authData.user?.id;
      if (!currentUserId || !authHeaders.Authorization) return;

      const [requestedRes, pendingRes, friendsRes] = await Promise.all([
        fetch('/api/friends?type=requested', { headers: authHeaders }),
        fetch('/api/friends?type=pending', { headers: authHeaders }),
        fetch('/api/friends?type=friends', { headers: authHeaders }),
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
    hydrateStatuses();
  }, [isOpen, hydrateStatuses]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      // Search for users by display name
      const response = await fetch(
        `/api/search/users?q=${encodeURIComponent(searchQuery)}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        await hydrateStatuses();
      }
    } catch (error) {
      console.error('Search failed:', error);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-(--bg-sidebar) border border-(--border-color) rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl"
        >
          <div className="p-6 border-b border-(--border-color) flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-(--accent-teal)" />
              <h2 className="text-lg font-bold text-(--text-main)">Add Friend</h2>
            </div>
            <SquishyButton
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-2 rounded-full transition-colors border-none shadow-none"
            >
              <X size={16} />
            </SquishyButton>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-(--border-color) focus:outline-none focus:border-(--accent-teal) bg-(--bg-dark) text-(--text-main)"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || loading}
                className="flex-shrink-0"
              >
                {loading ? '...' : 'Search'}
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {searchResults.length === 0 && searchQuery && !loading && (
                <p className="text-center py-4 text-(--text-muted) text-sm">
                  No users found
                </p>
              )}

              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-(--bg-dark) border border-(--border-color)"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || user.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-(--text-main) truncate">
                        {user.display_name || user.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        {user.status || 'offline'}
                      </p>
                    </div>
                  </div>

                  <SquishyButton
                    onClick={() => handleSendRequest(user.id)}
                    disabled={requestedUsers.has(user.id) || incomingRequests.has(user.id) || friendsSet.has(user.id)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors flex-shrink-0 ml-2 font-bold uppercase tracking-widest border-none shadow-none ${
                      requestedUsers.has(user.id) || incomingRequests.has(user.id) || friendsSet.has(user.id)
                        ? 'bg-(--bg-card) text-(--text-muted) cursor-not-allowed'
                        : 'bg-(--accent-teal) text-black hover:brightness-110'
                    }`}
                  >
                    {friendsSet.has(user.id) ? (
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

            {!searchQuery && (
              <div className="p-3 rounded-xl bg-(--bg-dark) text-center text-xs text-(--text-muted)">
                Enter a username to search for friends
              </div>
            )}
          </div>

          <div className="p-6 pt-0 flex justify-end">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

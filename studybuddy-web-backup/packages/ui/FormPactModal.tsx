'use client';

import React, { useState } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, X, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { playChime, playTick } from '@/lib/sound';

interface FormPactModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendsList?: any[];
  isFriendsLoading?: boolean;
  isPactsLoading?: boolean;
  currentUserId?: string | null;
  currentPact?: {
    id: string;
    pact_name: string;
    created_by?: string | null;
    constellation_color?: string | null;
    members?: Array<{ id: string; display_name?: string | null; avatar_url?: string | null }>;
  };
}

export const FormPactModal: React.FC<FormPactModalProps> = ({
  isOpen,
  onClose,
  friendsList = [],
  isFriendsLoading = false,
  isPactsLoading = false,
  currentUserId,
  currentPact,
}) => {
  const [pactName, setPactName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { createPact, leavePact, deletePact, addPactMembers } = useStudyStore();

  const isOwner = Boolean(currentUserId && currentPact?.created_by === currentUserId);
  const pactMemberIds = new Set((currentPact?.members || []).map((member) => member.id));

  const handleToggleFriend = (userId: string) => {
    playTick(); // Provide feedback for selection
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreatePact = async () => {
    if (!pactName.trim() || selectedFriends.length === 0) {
      alert('Please enter a pact name and select at least one member');
      return;
    }

    setLoading(true);
    try {
      await createPact(pactName, selectedFriends);
      playChime(); // Celebrate pact creation!
      setPactName('');
      setSelectedFriends([]);
      onClose();
    } catch (error) {
      console.error('Failed to create pact:', error);
      alert('Failed to create pact');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!currentPact?.id || pendingMembers.length === 0) {
      alert('Select at least one member to add');
      return;
    }

    setLoading(true);
    try {
      await addPactMembers(currentPact.id, pendingMembers);
      setPendingMembers([]);
    } catch (error) {
      console.error('Failed to add pact members:', error);
      alert('Failed to add pact members');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveOrDelete = async () => {
    if (!currentPact?.id) return;

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      if (isOwner) {
        await deletePact(currentPact.id);
      } else {
        await leavePact(currentPact.id);
      }
      onClose();
    } catch (error) {
      console.error('Failed to update pact:', error);
      alert('Failed to update pact');
    } finally {
      setLoading(false);
      setShowConfirm(false);
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
              <Sparkles size={18} className="text-(--accent-teal)" />
              <h2 className="text-lg font-bold text-(--text-main)">{currentPact ? 'Current Pact' : 'Form a Pact'}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-(--text-muted)">
              Create a constellation of learners. Your lanterns will cluster together on the network.
            </p>

            {currentPact && showConfirm && (
              <div className={`p-4 rounded-2xl border ${
                currentUserId && currentPact.created_by === currentUserId
                  ? 'bg-red-500/10 border-red-500/40'
                  : 'bg-(--bg-dark) border-(--border-color)'
              }`}>
                <p className={`text-xs font-black uppercase tracking-widest ${
                  currentUserId && currentPact.created_by === currentUserId
                    ? 'text-red-300'
                    : 'text-(--text-muted)'
                }`}>Confirm</p>
                <p className="text-sm text-(--text-main) mt-2">
                  {currentUserId && currentPact.created_by === currentUserId
                    ? 'Delete this pact for all members? This cannot be undone.'
                    : 'Leave this pact?'}
                </p>
              </div>
            )}

            {isPactsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-4 rounded bg-(--border-color) animate-pulse" />
                ))}
              </div>
            ) : currentPact ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-(--bg-dark) border border-(--border-color)">
                  <p className="text-xs font-black uppercase tracking-widest text-(--text-muted)">Pact Name</p>
                  <p className="text-sm font-bold text-(--text-main) mt-2">{currentPact.pact_name}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-(--text-muted)">Constellation</span>
                    <span className="w-4 h-4 rounded-full border border-(--border-color)" style={{ background: currentPact.constellation_color || '#2dd4bf' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-(--text-muted) mb-2">Members</p>
                  <div className="space-y-2">
                    {(currentPact.members || []).map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl bg-(--bg-dark) border border-(--border-color)">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.display_name || 'Member'} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-(--bg-card) border border-(--border-color)" />
                        )}
                        <span className="text-sm font-bold text-(--text-main)">{member.display_name || 'Unknown User'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {isOwner && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-(--text-muted) mb-2 flex items-center gap-2">
                      <Users size={12} className="text-(--accent-teal)" />
                      Add Members ({pendingMembers.length})
                    </p>
                    {friendsList.length === 0 || friendsList.every((friend) => {
                      const isUser1 = currentUserId && friend.user_id_1 === currentUserId;
                      const isUser2 = currentUserId && friend.user_id_2 === currentUserId;
                      const friendId = isUser1
                        ? friend.user_id_2
                        : isUser2
                          ? friend.user_id_1
                          : friend.user_id_2 || friend.user_id_1 || friend.id;
                      return pactMemberIds.has(friendId);
                    }) ? (
                      <p className="text-xs text-(--text-muted) p-3 rounded-xl bg-(--bg-dark) text-center">
                        No friends available to add.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {friendsList.map((friend) => {
                          const isUser1 = currentUserId && friend.user_id_1 === currentUserId;
                          const isUser2 = currentUserId && friend.user_id_2 === currentUserId;
                          const friendId = isUser1
                            ? friend.user_id_2
                            : isUser2
                              ? friend.user_id_1
                              : friend.user_id_2 || friend.user_id_1 || friend.id;
                          const friendData = isUser1
                            ? friend.profiles_2
                            : isUser2
                              ? friend.profiles_1
                              : friend.profiles_2 || friend.profiles_1 || friend;
                          const isAlreadyMember = Boolean(
                            currentPact.members?.some((member) => member.id === friendId)
                          );
                          if (isAlreadyMember) return null;
                          const isSelected = pendingMembers.includes(friendId);

                          return (
                            <label key={friendId} className="flex items-center gap-3 p-2 rounded-xl bg-(--bg-dark) border border-(--border-color) cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  setPendingMembers((prev) =>
                                    prev.includes(friendId)
                                      ? prev.filter((id) => id !== friendId)
                                      : [...prev, friendId]
                                  )
                                }
                                className="w-4 h-4 rounded"
                                disabled={loading}
                              />
                              {friendData?.avatar_url && (
                                <img
                                  src={friendData.avatar_url}
                                  alt={friendData.display_name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              )}
                              <span className="text-sm text-(--text-main) flex-1 truncate">
                                {friendData?.display_name || 'Unknown User'}
                              </span>
                              {isSelected && <CheckCircle2 size={14} className="text-(--accent-teal)" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <div className="pt-3 flex justify-end">
                      <Button
                        onClick={handleAddMembers}
                        disabled={loading || pendingMembers.length === 0}
                      >
                        {loading ? 'Adding...' : 'Add Members'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-(--text-muted) block mb-2">Pact Name</label>
              <input
                type="text"
                value={pactName}
                onChange={(e) => setPactName(e.target.value)}
                placeholder="e.g., Study Group"
                className="w-full px-3 py-2 rounded-lg border border-(--border-color) focus:outline-none focus:border-(--accent-teal) bg-(--bg-dark) text-(--text-main)"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-(--text-muted) block mb-2 flex items-center gap-2">
                <Users size={12} className="text-(--accent-teal)" />
                Members ({selectedFriends.length})
              </label>
              {isFriendsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-(--bg-dark)/30 animate-pulse">
                      <div className="w-4 h-4 bg-(--border-color) rounded" />
                      <div className="w-8 h-8 bg-(--border-color) rounded-full" />
                      <div className="h-4 bg-(--border-color) rounded w-28" />
                    </div>
                  ))}
                </div>
              ) : friendsList.length === 0 ? (
                <p className="text-xs text-(--text-muted) p-3 rounded-xl bg-(--bg-dark) text-center">
                  No friends yet. Add friends to form a pact.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {friendsList.map((friend) => {
                    const isUser1 = currentUserId && friend.user_id_1 === currentUserId;
                    const isUser2 = currentUserId && friend.user_id_2 === currentUserId;
                    const friendId = isUser1
                      ? friend.user_id_2
                      : isUser2
                        ? friend.user_id_1
                        : friend.user_id_2 || friend.user_id_1 || friend.id;
                    const friendData = isUser1
                      ? friend.profiles_2
                      : isUser2
                        ? friend.profiles_1
                        : friend.profiles_2 || friend.profiles_1 || friend;
                    const isSelected = selectedFriends.includes(friendId);

                    return (
                      <label key={friendId} className="flex items-center gap-3 p-2 rounded-xl bg-(--bg-dark) border border-(--border-color) cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFriend(friendId)}
                          className="w-4 h-4 rounded"
                          disabled={loading}
                        />
                        {friendData?.avatar_url && (
                          <img
                            src={friendData.avatar_url}
                            alt={friendData.display_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <span className="text-sm text-(--text-main) flex-1 truncate">
                          {friendData?.display_name || 'Unknown User'}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-(--accent-teal)" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedFriends.length > 0 && (
              <div className="p-3 rounded-xl bg-(--bg-dark) border border-(--border-color) text-xs text-(--text-muted)">
                When the pact forms, all members share a constellation color on the network.
              </div>
            )}
              </>
            )}
          </div>

          <div className="p-6 pt-0 flex justify-end gap-2">
            <Button onClick={onClose} variant="secondary" disabled={loading}>
              Cancel
            </Button>
            {currentPact ? (
              <>
                {showConfirm && (
                  <Button
                    onClick={() => setShowConfirm(false)}
                    variant="secondary"
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                <Button onClick={handleLeaveOrDelete} variant="secondary" disabled={loading}>
                  {showConfirm
                    ? (currentUserId && currentPact.created_by === currentUserId ? 'Confirm Delete' : 'Confirm Leave')
                    : (currentUserId && currentPact.created_by === currentUserId ? 'Delete Pact' : 'Leave Pact')}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCreatePact}
                disabled={loading || !pactName.trim() || selectedFriends.length === 0}
              >
                {loading ? 'Creating...' : 'Form Pact'}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

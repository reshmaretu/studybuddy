'use client';

import React, { useEffect } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X } from 'lucide-react';
import { Button } from './Button';
import { SquishyButton } from './SquishyButton';

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRequestModal: React.FC<FriendRequestModalProps> = ({ isOpen, onClose }) => {
  const { friendRequests, fetchFriendRequests, acceptFriendRequest, rejectFriendRequest } = useStudyStore();

  useEffect(() => {
    if (isOpen) {
      fetchFriendRequests();
    }
  }, [isOpen, fetchFriendRequests]);

  if (!isOpen) return null;

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 md:p-4">
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
          className="bg-(--bg-sidebar) border border-(--border-color) rounded-2xl md:rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl"
        >
          <div className="p-3 md:p-6 border-b border-(--border-color) flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="md:w-[18px] md:h-[18px] text-(--accent-teal)" />
              <h2 className="text-sm md:text-lg font-bold text-(--text-main)">Friend Requests</h2>
            </div>
            <SquishyButton
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-1 md:p-2 rounded-full transition-colors border-none shadow-none"
            >
              <X size={14} className="md:w-4 md:h-4" />
            </SquishyButton>
          </div>

          <div className="p-3 md:p-6 space-y-2 md:space-y-4">
            {friendRequests.length === 0 ? (
              <p className="text-center py-4 md:py-8 text-(--text-muted) text-xs md:text-sm">
                No pending friend requests
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {friendRequests.map((request) => {
                  // Handle both RPC format (requester_name/requester_avatar) and direct query format (profiles_1/profiles_2)
                  const displayName = request.requester_name || request.profiles_1?.display_name || request.profiles_2?.display_name || 'Unknown User';
                  const avatarUrl = request.requester_avatar || request.profiles_1?.avatar_url || request.profiles_2?.avatar_url;
                  
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-2 md:p-3 rounded-lg md:rounded-xl bg-(--bg-dark) border border-(--border-color) gap-2"
                    >
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        {avatarUrl && (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 md:w-10 h-8 md:h-10 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] md:text-sm text-(--text-main) truncate">
                            {displayName}
                          </p>
                          <p className="text-[9px] md:text-xs text-(--text-muted)">Wants friends</p>
                        </div>
                      </div>

                      <div className="flex gap-1 md:gap-2 flex-shrink-0">
                        <SquishyButton
                          onClick={() => handleAccept(request.id)}
                          className="px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-xs rounded-lg md:rounded-lg bg-(--accent-teal) text-black hover:brightness-110 transition-colors font-bold uppercase tracking-widest border-none shadow-none"
                        >
                          ✓
                        </SquishyButton>
                        <SquishyButton
                          onClick={() => handleReject(request.id)}
                          className="px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-xs rounded-lg md:rounded-lg bg-(--bg-card) text-(--text-muted) hover:text-(--text-main) transition-colors font-bold uppercase tracking-widest border-none shadow-none"
                        >
                          ✕
                        </SquishyButton>
                      </div>
                    </div>
                  );
                })}
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

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
              <Users size={18} className="text-(--accent-teal)" />
              <h2 className="text-lg font-bold text-(--text-main)">Friend Requests</h2>
            </div>
            <SquishyButton
              onClick={onClose}
              className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-2 rounded-full transition-colors border-none shadow-none"
            >
              <X size={16} />
            </SquishyButton>
          </div>

          <div className="p-6 space-y-4">
            {friendRequests.length === 0 ? (
              <p className="text-center py-8 text-(--text-muted) text-sm">
                No pending friend requests
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {friendRequests.map((request) => {
                  const requesterId = request.requester_id || request.user_id_1;
                  const requester = request.user_id_1 === requesterId ? request.profiles_1 : request.profiles_2;
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-(--bg-dark) border border-(--border-color)"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {requester?.avatar_url && (
                          <img
                            src={requester.avatar_url}
                            alt={requester.display_name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-(--text-main) truncate">
                            {requester?.display_name || requester?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-(--text-muted)">Wants to be friends</p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        <SquishyButton
                          onClick={() => handleAccept(request.id)}
                          className="px-3 py-1 text-xs rounded-lg bg-(--accent-teal) text-black hover:brightness-110 transition-colors font-bold uppercase tracking-widest border-none shadow-none"
                        >
                          Accept
                        </SquishyButton>
                        <SquishyButton
                          onClick={() => handleReject(request.id)}
                          className="px-3 py-1 text-xs rounded-lg bg-(--bg-card) text-(--text-muted) hover:text-(--text-main) transition-colors font-bold uppercase tracking-widest border-none shadow-none"
                        >
                          Reject
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

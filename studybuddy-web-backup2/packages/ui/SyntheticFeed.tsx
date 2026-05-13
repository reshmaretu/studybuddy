'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase, useStudyStore } from '@studybuddy/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Radio, Sparkles, Target, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SquishyButton } from './SquishyButton';
import { playTick } from '@studybuddy/api';

export const SyntheticFeed = () => {
  const { broadcasts, fetchBroadcasts, triggerChumToast, sparkBroadcast, setSparkBurst } = useStudyStore();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sparkedIds, setSparkedIds] = useState<Set<string>>(new Set());
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        await fetchBroadcasts(5, 0);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load broadcasts:', error);
        setLoading(false);
      }
    };

    loadBroadcasts();
  }, [fetchBroadcasts]);

  useEffect(() => {
    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    syncUser();
  }, []);

  // 📡 REALTIME BROADCASTS & SPARKS
  useEffect(() => {
    const channel = supabase
      .channel('broadcasts-feed')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'synthetic_logs' 
      }, (payload) => {
        const newBroadcast = payload.new as any;
        if (['milestone', 'study-room', 'canvas-room'].includes(newBroadcast.broadcast_type)) {
          fetchBroadcasts(10, 0);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'synthetic_logs' 
      }, (payload) => {
        const updated = payload.new as any;
        
        // 1. Update the store to keep everything in sync
        useStudyStore.setState((state) => ({
          broadcasts: state.broadcasts.map(b => 
            b.id === updated.id ? { ...b, reactions_count: updated.reactions_count } : b
          )
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchBroadcasts]);

  const loadMore = async () => {
    try {
      await fetchBroadcasts(20, broadcasts.length);
    } catch (error) {
      console.error('Failed to load more broadcasts:', error);
    }
  };

  const handleSpark = (name: string, id: string, e: React.MouseEvent) => {
    const now = Date.now();
    if (now < cooldownUntil) return;
    if (sparkedIds.has(id)) return;

    setSparkedIds((prev) => new Set(prev).add(id));
    setCooldownUntil(now + 2000);
    
    playTick();
    
    sparkBroadcast(id); // Persist to network!
    const safeName = name?.trim() || 'that user';
    triggerChumToast?.(`You sparked ${safeName}'s feed`, 'success');
  };

  if (loading) {
    return (
      <div className="w-full p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        <p className="text-sm text-base-content/60 mt-2">Loading network feed...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
        <Radio size={14} className="text-[var(--accent-yellow)]" /> Network Updates
      </h3>

      {broadcasts.length === 0 ? (
        <div className="p-4 text-center text-sm text-[var(--text-muted)] rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)]">
          <p>No broadcasts yet. Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {broadcasts
              .filter(b => ['milestone', 'study-room', 'canvas-room'].includes(b.broadcast_type))
              .slice(0, 5)
              .map((broadcast) => {
                const displayName = broadcast.profiles?.display_name || 'Anonymous';
                const isSelf = currentUserId ? broadcast.user_id === currentUserId : false;
                const isSparked = sparkedIds.has(broadcast.id);
                const isCoolingDown = Date.now() < cooldownUntil;
                const sparkDisabled = isSelf || isSparked || isCoolingDown;
                
                const isRoom = broadcast.broadcast_type === 'study-room' || broadcast.broadcast_type === 'canvas-room';
                const roomCode = broadcast.profiles?.joined_room_code || (broadcast.profiles?.status === 'hosting' ? 'ACTIVE' : null);
                // Note: We'd ideally need the actual room code from the broadcast metadata, 
                // but we'll fall back to the host's current status for now.
                
                return (
              <div
                key={broadcast.id}
                className="p-4 rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)] hover:border-[var(--accent-teal)]/40 transition-colors relative"
              >
                <div className="flex items-start gap-3">
                  {broadcast.profiles?.avatar_url && (
                    <img
                      src={broadcast.profiles.avatar_url}
                      alt={broadcast.profiles.display_name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[var(--text-main)] truncate">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-main)]/80 break-words">
                      {broadcast.content}
                    </p>
                    {broadcast.broadcast_type !== 'custom-status' && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
                          {broadcast.broadcast_type === 'milestone' ? (
                            <Sparkles size={12} className="text-[var(--accent-yellow)]" />
                          ) : broadcast.broadcast_type === 'study-room' ? (
                            <Radio size={12} className="text-[var(--accent-teal)]" />
                          ) : broadcast.broadcast_type === 'canvas-room' ? (
                            <Radio size={12} className="text-[var(--accent-cyan)]" />
                          ) : (
                            <MessageCircle size={12} className="text-[var(--text-muted)]" />
                          )}
                          {broadcast.broadcast_type === 'milestone'
                            ? 'Milestone'
                            : broadcast.broadcast_type === 'study-room'
                            ? 'Study Room'
                            : broadcast.broadcast_type === 'canvas-room'
                            ? 'Canvas Room'
                            : 'Update'}
                        </span>

                        {isRoom && (
                          <button
                            onClick={() => {
                              const code = broadcast.profiles?.joined_room_code;
                              if (code) {
                                window.location.href = broadcast.broadcast_type === 'canvas-room' 
                                  ? `/canvas?room=${code}` 
                                  : `/room/${code}`;
                              }
                            }}
                            disabled={!broadcast.profiles?.status || (broadcast.profiles.status !== 'hosting' && broadcast.profiles.status !== 'cafe')}
                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                              (broadcast.profiles?.status === 'hosting' || broadcast.profiles?.status === 'cafe')
                                ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)] text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                                : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed'
                            }`}
                          >
                            {(broadcast.profiles?.status === 'hosting' || broadcast.profiles?.status === 'cafe') ? 'Join Now' : 'Expired'}
                          </button>
                        )}
                      </div>
                    )}
                    {broadcast.reactions_count > 0 && (
                      <div className="mt-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={12} className="text-[var(--accent-teal)]" />
                        {broadcast.reactions_count} reactions
                      </div>
                    )}
                  </div>
                </div>
                {!isSelf && (
                <SquishyButton
                  disabled={sparkDisabled}
                  onClick={(e) => handleSpark(displayName, broadcast.id, e)}
                  className={`absolute right-4 bottom-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
                    sparkDisabled
                      ? 'border-[var(--border-color)] text-[var(--text-muted)]/60 cursor-not-allowed'
                      : 'border-[var(--accent-teal)]/30 text-[var(--accent-teal)] hover:bg-[var(--accent-teal)] hover:text-[#0b1211]'
                  }`}
                  title={isSparked ? 'Already sparked.' : isCoolingDown ? 'Cooling down...' : 'Spark this broadcast'}
                >
                  <Sparkles size={12} /> Spark
                </SquishyButton>
                )}
              </div>
            );
            })}
          </div>

        </>
      )}
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useStudyStore, Task, useTerms, playChime, playTick } from "@studybuddy/api";
import { MoreHorizontal, Pin, Clock, Edit2, Trash2, X, Check, Zap, Lock, Eye, AlertTriangle, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from 'canvas-confetti';
import { ConfirmationModal } from './ConfirmationModal';

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    locked?: boolean;
    isMinimized?: boolean;
    onToggleSelect?: (id: string) => void;
    selected?: boolean;
    completionEffect?: 'bloom' | 'glide';
    isAnimating?: boolean;
    layoutId?: string;
    isRecentlyCompleted?: boolean;
}

export const TaskCard = ({ task, isOverlay = false, locked = false, isMinimized = false, onToggleSelect, selected = false, completionEffect = 'bloom', isAnimating: externalIsAnimating, layoutId, isRecentlyCompleted }: TaskCardProps) => {
    const { 
        openFocusModal, deleteTask, updateTask, tasks, triggerChumToast, 
        openEditModal, openViewModal, completeTask, userId,
        doubleClickToComplete = true, dndEnabled = true,
        requireCompletionConfirmation = true
    } = useStudyStore();
    const { terms } = useTerms();

    const [showMenu, setShowMenu] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);

    // 🕒 3-PHASE DEADLINE ENFORCEMENT
    const dlStatus = React.useMemo(() => {
        const deadline = task.deadline;
        if (!deadline || task.isCompleted) return { phase: 1, label: "Neutral", color: "text-(--text-muted)", bg: "", border: "" };
        const now = new Date();
        const dl = new Date(deadline).getTime();
        const diffHours = (dl - now.getTime()) / (1000 * 60 * 60);

        if (diffHours < 0) return { phase: 3, label: "CRITICAL", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" };
        if (diffHours <= 2) return { phase: 3, label: "URGENT", color: "text-red-500 animate-pulse", bg: "bg-red-500/5", border: "border-red-500/50" };
        if (diffHours <= 12) return { phase: 2, label: "SOON", color: "text-orange-400", bg: "bg-orange-400/5", border: "border-orange-400/30" };
        return { phase: 1, label: "LATER", color: "text-teal-400", bg: "bg-teal-400/5", border: "border-teal-400/20" };
    }, [task.deadline, task.isCompleted]);

    const formatDeadline = React.useCallback((dl: string | undefined) => {
        if (!dl) return "";
        const d = new Date(dl);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }, []);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: showMenu || locked || task.isCompleted || showDeleteModal || showCompletionConfirm || !dndEnabled || isAnimating,
    });

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (doubleClickToComplete && !task.isCompleted && !locked && !isAnimating) {
            if (requireCompletionConfirmation) {
                setShowCompletionConfirm(true);
            } else {
                handleCompleteDirectly();
            }
        }
    };

    const handleCompleteDirectly = () => {
        setIsAnimating(true);
        playChime();
        
        const rect = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement;
        if (rect) {
            const bounds = rect.getBoundingClientRect();
            const x = (bounds.left + bounds.width / 2) / window.innerWidth;
            const y = (bounds.top + bounds.height / 2) / window.innerHeight;
            confetti({
                particleCount: 80,
                spread: 100,
                origin: { x, y },
                colors: ['#2dd4bf', '#facc15', '#ff007f', '#8b5cf6'],
                gravity: 1.2,
                decay: 0.95,
                zIndex: 100000
            });
        }
        
        triggerChumToast(task.isFrog ? "FROG DEVOURED. Momentum surge detected!" : "Quest completed!", "success");
        
        setTimeout(() => {
            completeTask(task.id);
        }, 800);
    };

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const loadColors = {
        light: "text-(--accent-teal) border-(--accent-teal)/30 bg-(--accent-teal)/10",
        medium: "text-(--accent-yellow) border-(--accent-yellow)/30 bg-(--accent-yellow)/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    const ActionMenu = (
        <AnimatePresence>
            {showMenu && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-0 w-40 bg-(--bg-sidebar) border border-(--border-color) rounded-xl shadow-2xl z-[1001] origin-top-right backdrop-blur-xl"
                >
                    {!task.isCompleted && (
                        <button onClick={(e) => { 
                            e.stopPropagation();
                            if (requireCompletionConfirmation) {
                                setShowCompletionConfirm(true);
                            } else {
                                handleCompleteDirectly();
                            }
                            setShowMenu(false);
                        }} className="w-full px-3 py-2 text-xs font-bold text-(--text-main) hover:bg-(--accent-teal)/10 flex items-center gap-2 border-b border-(--border-color) active:scale-95 transition-transform">
                            <Check size={12} className="text-(--accent-teal)" /> {terms.completed}
                        </button>
                    )}
                    <button onClick={() => { openViewModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                        <Eye size={12} className="text-(--accent-teal)" /> Details
                    </button>
                    {!task.isCompleted && (
                        <button onClick={() => { openEditModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                            <Edit2 size={12} className="text-(--accent-teal)" /> Edit Record
                        </button>
                    )}
                    <button 
                        onClick={() => { 
                            playTick();
                            updateTask(task.id, { isPinned: !task.isPinned }); 
                            setShowMenu(false); 
                        }} 
                        className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2 border-b border-(--border-color) ${task.isPinned ? 'text-teal-400 bg-teal-400/5' : 'hover:bg-(--bg-dark)'}`}
                    >
                        <Pin size={12} className={task.isPinned ? 'text-teal-400' : 'text-(--text-muted)'} /> 
                        {task.isPinned ? 'Unpin' : 'Pin to Top'}
                    </button>
                    {!task.isCompleted && (
                        <button 
                            onClick={() => { 
                                playTick();
                                updateTask(task.id, { isFrog: !task.isFrog }); 
                                setShowMenu(false); 
                                triggerChumToast(task.isFrog ? "Frog released back into the wild." : "FROG CAPTURED. Tackle this first!", "info");
                            }} 
                            className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2 border-b border-(--border-color) ${task.isFrog ? 'text-orange-400 bg-orange-400/5' : 'hover:bg-(--bg-dark)'}`}
                        >
                            <Flame size={12} className={task.isFrog ? 'text-orange-400' : 'text-(--text-muted)'} /> 
                            {task.isFrog ? 'Unmark Frog' : 'Mark as Frog'}
                        </button>
                    )}
                    <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 flex items-center gap-2">
                        <Trash2 size={12} /> Release
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <motion.div 
            data-task-id={task.id}
            layoutId={layoutId}
            layout
            ref={setNodeRef} 
            style={{ 
                ...style, 
                touchAction: 'none',
                willChange: (isAnimating || externalIsAnimating || isDragging || isRecentlyCompleted) ? "transform, opacity, filter" : "auto",
                zIndex: (isAnimating || externalIsAnimating || isRecentlyCompleted) ? 9999 : (isOverlay ? 100001 : (showMenu || showCompletionConfirm ? 1001 : 10)),
                pointerEvents: (isAnimating || externalIsAnimating) ? "none" : "auto"
            }} 
            {...listeners} 
            {...attributes}
            onDoubleClick={() => {
                if (doubleClickToComplete && !task.isCompleted && !locked && !isAnimating) {
                    if (requireCompletionConfirmation) {
                        setShowCompletionConfirm(true);
                    } else {
                        handleCompleteDirectly();
                    }
                }
            }}
            animate={(isAnimating || externalIsAnimating) ? {
                scale: [1, 1.1, 1.05],
                rotate: [0, -2, 2],
                y: [0, -10, -5],
                boxShadow: [
                    "0 0 0 rgba(0,0,0,0)",
                    "0 20px 40px rgba(0,0,0,0.4), 0 0 20px var(--accent-teal)",
                    "0 15px 30px rgba(0,0,0,0.3), 0 0 15px var(--accent-teal)"
                ]
            } : isRecentlyCompleted ? {
                scale: [1, 1.2, 1],
                filter: ["brightness(1)", "brightness(2) blur(4px)", "brightness(1) blur(0px)"],
                boxShadow: [
                    "0 0 0 rgba(0,0,0,0)",
                    "0 0 30px var(--accent-teal)",
                    "0 0 0 rgba(0,0,0,0)"
                ]
            } : { 
                scale: task.isCompleted ? 1 : 1,
                opacity: isDragging ? 0.4 : 1,
                rotate: 0,
                y: 0
            }}
            transition={{
                duration: (isAnimating || externalIsAnimating) ? 0.6 : (isRecentlyCompleted ? 0.8 : 0.3),
                ease: "easeOut"
            }}
            className={`group relative bg-(--bg-card) border-2 rounded-xl md:rounded-2xl p-2 md:p-4 min-h-[100px] md:min-h-[120px] flex flex-col transition-shadow ${selected ? 'border-(--accent-teal) shadow-[0_0_18px_rgba(45,212,191,0.25)]' : ''} ${dlStatus.phase === 3 && !task.isCompleted ? 'ring-1 ring-red-500/20' : ''} ${isOverlay ? 'shadow-2xl border-(--accent-teal)' : dlStatus.border || 'border-(--border-color)'}`}
        >
            {/* ⚡ CLIPPING CONTAINER FOR BG EFFECTS */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* ⚡ PHASE OVERLAY (Subtle Glow) */}
                {!task.isCompleted && dlStatus.phase > 1 && (
                    <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-20 ${dlStatus.bg}`} />
                )}
            </div>

            <div className="flex justify-between items-start mb-1 md:mb-2 relative z-30 gap-1">
                <div className="flex gap-1 md:gap-2 items-center flex-wrap">
                    <span className={`text-[7px] md:text-[9px] font-black uppercase px-2 md:px-3 py-0.5 md:py-1 rounded-lg border tracking-tighter ${loadColors[task.load]}`}>{task.load}</span>
                    {task.isPinned && !task.isCompleted && <Pin size={8} className="text-teal-400 hidden md:block" />}
                    {/* FROG BADGE (Relocated to top-left for zero conflict) */}
                    {task.isFrog && !task.isCompleted && (
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="bg-orange-400 text-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg shadow-sm border border-orange-500/30 flex items-center gap-0.5 md:gap-1 shrink-0"
                        >
                            <Flame size={8} className="fill-current" />
                            <span className="text-[7px] md:text-[8px] font-black uppercase hidden md:inline">Frog</span>
                        </motion.div>
                    )}
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Multi-select Checkbox */}
                    {onToggleSelect && !isOverlay && !locked && (
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect(task.id);
                            }}
                            className={`w-4 h-4 md:w-6 md:h-6 rounded-md border flex items-center justify-center transition-all ${
                                selected
                                    ? 'bg-(--accent-teal) border-(--accent-teal) text-black opacity-100'
                                    : 'bg-(--bg-dark) border-(--border-color) text-(--text-muted) hover:text-(--text-main) opacity-0 group-hover:opacity-100'
                            }`}
                        >
                            {selected ? <Check size={10} strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                        </button>
                    )}

                    {/* Due Label */}
                    {task.isCompleted ? (
                        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[var(--accent-teal)]">✓</span>
                    ) : dlStatus.phase > 1 && (
                        <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest ${dlStatus.color}`}>{dlStatus.label}</span>
                    )}

                    {/* Three-dot Button */}
                    <button id="task-card-menu-trigger" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-(--text-muted) hover:text-(--text-main) transition-colors relative z-40 p-1"><MoreHorizontal size={14} className="md:w-4 md:h-4 w-3 h-3" /></button>
                </div>
                <div className="absolute right-0 top-0">
                    {ActionMenu}
                </div>
            </div>

            <div className="relative z-10 flex-1">
                <h3 className={`text-[12px] md:text-[15px] font-bold leading-tight mb-0.5 md:mb-1 transition-all ${task.isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'} line-clamp-2`}>
                    {task.title}
                </h3>
                {task.description && !isMinimized && (
                    <p className="text-[9px] md:text-[11px] text-(--text-muted) line-clamp-1 md:line-clamp-2 leading-relaxed font-medium mb-2 md:mb-3">
                        {task.description}
                    </p>
                )}

                <div className="flex justify-between items-center mt-auto pt-1 md:pt-2 border-t border-(--border-color)/30 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                        {task.deadline && !task.isCompleted && (
                            <div className={`flex items-center gap-0.5 md:gap-1.5 ${dlStatus.color}`}>
                                {dlStatus.phase === 3 ? <AlertTriangle size={8} className="hidden md:block" /> : <Clock size={8} className="hidden md:block" />}
                                <span className="text-[7px] md:text-[9px] font-black tracking-widest uppercase">{formatDeadline(task.deadline)}</span>
                            </div>
                        )}
                        {task.isCompleted && task.completedAt && (
                            <div className="flex items-center gap-0.5 md:gap-1.5 text-teal-500/60">
                                <Check size={8} className="hidden md:block" />
                                <span className="text-[7px] md:text-[9px] font-black tracking-widest uppercase">
                                    Completed {new Date(task.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FOCUS BUTTON (Hover only, bottom right) */}
            {!task.isCompleted && !isMinimized && (
                <div className={`absolute bottom-2 md:bottom-4 right-2 md:right-4 opacity-0 group-hover:opacity-100 transition-all z-20 transform translate-y-2 group-hover:translate-y-0 ${showMenu || showCompletionConfirm ? 'pointer-events-none invisible' : ''}`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openFocusModal(task.id);
                        }}
                        className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-(--accent-teal) text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Focus on this quest"
                    >
                        <Zap size={12} fill="currentColor" className="md:w-3.5 md:h-3.5" />
                    </button>
                </div>
            )}

            {/* COMPLETION CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showCompletionConfirm}
                title="Complete Task?"
                message={task.isFrog ? "Mark this frog as devoured and feel the momentum surge!" : `Complete "${task.title}" and master this quest?`}
                confirmText="Complete"
                cancelText="Cancel"
                onConfirm={() => {
                    setShowCompletionConfirm(false);
                    handleCompleteDirectly();
                }}
                onCancel={() => setShowCompletionConfirm(false)}
            />

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Release Quest?"
                message={`Are you sure you want to release "${task.title}" back to the void? This action cannot be undone.`}
                confirmText="Release"
                cancelText="Keep"
                isDangerous={true}
                onConfirm={() => {
                    setShowDeleteModal(false);
                    deleteTask(task.id);
                    triggerChumToast("Quest released back to the void.", "info");
                }}
                onCancel={() => setShowDeleteModal(false)}
            />
        </motion.div>
    );
};

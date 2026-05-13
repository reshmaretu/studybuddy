"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStudyStore } from "@/store/useStudyStore";
import { X, Clock, Edit2, Zap, Pin, Check } from "lucide-react";
import { SquishyButton } from "@studybuddy/ui";

export default function TaskViewModal() {
    const { isViewModalOpen, viewingTaskId, tasks, closeViewModal, openEditModal } = useStudyStore();
    const task = tasks.find(t => t.id === viewingTaskId);

    if (!task) return null;

    const loadColors = {
        light: "text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10",
        medium: "text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30 bg-[var(--accent-yellow)]/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    return (
        <AnimatePresence>
            {isViewModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeViewModal}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] w-full max-w-md relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden max-h-[90vh]"
                    >
                        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]/50">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${loadColors[task.load]}`}>{task.load}</span>
                                {task.isPinned && <Pin size={14} className="text-[var(--accent-teal)] ml-2" />}
                                {task.isFrog && <span className="text-xl">🐸</span>}
                            </div>
                            <SquishyButton onClick={closeViewModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 bg-[var(--bg-dark)] rounded-xl border border-[var(--border-color)] transition-all">
                                <X size={18} />
                            </SquishyButton>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)] leading-tight">{task.title}</h2>
                                {task.deadline && !task.isCompleted && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent-teal)] mt-3">
                                        <Clock size={14} /> Due: {task.deadline ? new Date(task.deadline).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline'}
                                    </div>
                                )}
                                {task.isCompleted && task.completedAt && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent-teal)] mt-3">
                                        <Check size={14} /> Completed: {new Date(task.completedAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-3xl p-6 min-h-[120px] shadow-inner">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
                                    <Zap size={10} className="text-[var(--accent-teal)] outline-none" />
                                    Field Notes
                                </h4>
                                <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap leading-relaxed font-medium">
                                    {task.description || <span className="italic text-[var(--text-muted)] opacity-50 font-normal">No description provided.</span>}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 flex justify-end">
                            {!task.isCompleted && (
                                <SquishyButton 
                                    onClick={() => { 
                                        closeViewModal(); 
                                        openEditModal(task.id); 
                                    }} 
                                    className="px-8 py-3 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] font-black uppercase tracking-widest text-xs transition-all shadow-[0_4px_15px_rgba(45,212,191,0.2)] flex items-center gap-3"
                                >
                                    <Edit2 size={14} /> Edit Task
                                </SquishyButton>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

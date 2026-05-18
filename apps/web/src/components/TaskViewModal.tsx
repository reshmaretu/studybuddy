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
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeViewModal}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-5 md:p-6 shadow-2xl relative z-10 w-full max-w-md flex flex-col my-auto max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0 border-b border-[var(--border-color)] pb-3">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${loadColors[task.load]}`}>{task.load}</span>
                                {task.isPinned && <Pin size={14} className="text-[var(--accent-teal)]" />}
                                {task.isFrog && <span className="text-xl">🐸</span>}
                            </div>
                            <button onClick={closeViewModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6 mb-4">
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

                        {/* Footer */}
                        <div className="flex gap-3 pt-4 pb-2 border-t border-[var(--border-color)] shrink-0 mt-2">
                            {!task.isCompleted && (
                                <SquishyButton 
                                    onClick={() => { 
                                        closeViewModal(); 
                                        openEditModal(task.id); 
                                    }} 
                                    className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] hover:brightness-110 font-black uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-3 m-0 border-none"
                                >
                                    <Edit2 size={14} /> Edit Quest
                                </SquishyButton>
                            )}
                            <SquishyButton onClick={closeViewModal} className="w-full py-3.5 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 text-xs font-extrabold transition-all shadow-none uppercase tracking-widest flex items-center justify-center m-0">
                                Close
                            </SquishyButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

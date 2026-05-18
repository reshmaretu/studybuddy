"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyStore, TaskLoad } from "@/store/useStudyStore";
import { Flame, X, Check, Clock, Edit3, Trash2, Pin } from "lucide-react";
import { SquishyButton } from "@studybuddy/ui";

export default function TaskEditModal() {
    const { isEditModalOpen, editingTaskId, tasks, updateTask, closeEditModal } = useStudyStore();
    const task = tasks.find(t => t.id === editingTaskId);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [load, setLoad] = useState<TaskLoad>("medium");
    const [deadline, setDeadline] = useState("");
    const [isFrog, setIsFrog] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || "");
            setLoad(task.load);
            setDeadline(task.deadline || "");
            setIsFrog(task.isFrog || false);
            setIsPinned(task.isPinned || false);
        }
    }, [task]);

    if (!task) return null;

    const handleSave = () => {
        if (!title.trim()) return;
        updateTask(task.id, {
            title,
            description,
            load,
            deadline: deadline || undefined,
            isFrog,
            isPinned
        });
        closeEditModal();
    };

    const loadColors = {
        light: "text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10",
        medium: "text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30 bg-[var(--accent-yellow)]/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    return (
        <AnimatePresence>
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeEditModal}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-5 md:p-6 shadow-2xl relative z-10 w-full max-w-lg flex flex-col my-auto max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0 border-b border-[var(--border-color)] pb-3">
                            <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs text-[var(--text-muted)]">
                                <Edit3 size={16} className="text-[var(--accent-teal)]" />
                                Edit Quest
                            </div>
                            <button onClick={closeEditModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6 mb-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Quest Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter quest name..."
                                        className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-all placeholder:text-[var(--text-muted)]/30 font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Field Notes</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add some context..."
                                        rows={4}
                                        className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-all resize-none placeholder:text-[var(--text-muted)]/30"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Cognitive Load</label>
                                    <div className="flex gap-1.5 bg-[var(--bg-dark)] p-1 rounded-2xl border border-[var(--border-color)]">
                                        {(['light', 'medium', 'heavy'] as const).map(l => (
                                            <button
                                                key={l}
                                                onClick={() => setLoad(l)}
                                                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all ${load === l
                                                        ? loadColors[l] + ' shadow-sm'
                                                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Deadline (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-all"
                                    />
                                </div>
                            </div>

                            {/* 📌 PIN TOGGLE */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-[2rem] p-4 flex items-center justify-between group hover:border-[var(--accent-teal)]/30 transition-all cursor-pointer" onClick={() => setIsFrog(!isFrog)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-all ${isFrog ? 'bg-orange-400 text-black' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
                                            <Flame size={16} />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Frog</h4>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full p-1 flex items-center transition-all ${isFrog ? 'bg-orange-400' : 'bg-[var(--bg-sidebar)] border border-[var(--border-color)]'}`}>
                                        <div className={`w-3 h-3 rounded-full shadow-md transition-all ${isFrog ? 'translate-x-5 bg-black' : 'translate-x-0 bg-[var(--text-muted)]'}`} />
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-[2rem] p-4 flex items-center justify-between group hover:border-[var(--accent-teal)]/30 transition-all cursor-pointer" onClick={() => setIsPinned(!isPinned)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-all ${isPinned ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
                                            <Pin size={16} />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Pinned</h4>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full p-1 flex items-center transition-all ${isPinned ? 'bg-[var(--accent-teal)]' : 'bg-[var(--bg-sidebar)] border border-[var(--border-color)]'}`}>
                                        <div className={`w-3 h-3 rounded-full shadow-md transition-all ${isPinned ? 'translate-x-5 bg-[#0b1211]' : 'translate-x-0 bg-[var(--text-muted)]'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 pt-4 pb-2 border-t border-[var(--border-color)] shrink-0 mt-2">
                            <SquishyButton
                                onClick={closeEditModal}
                                className="w-full py-3.5 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 text-xs font-extrabold transition-all shadow-none uppercase tracking-widest flex items-center justify-center m-0"
                            >
                                Cancel
                            </SquishyButton>
                            <SquishyButton
                                onClick={handleSave}
                                disabled={!title.trim()}
                                className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] hover:brightness-110 font-black uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center m-0 border-none disabled:opacity-50"
                            >
                                Save Changes
                            </SquishyButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

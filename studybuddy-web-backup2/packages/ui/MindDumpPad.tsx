"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, X, CheckSquare, Hammer } from "lucide-react";
import { useStudyStore } from "@studybuddy/api";

export const MindDumpPad = () => {
    const { isMindDumpOpen, toggleMindDump, addTask, forgeShard } = useStudyStore();
    const [content, setContent] = useState("");

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMindDumpOpen) toggleMindDump();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isMindDumpOpen, toggleMindDump]);

    if (!isMindDumpOpen) return null;

    const handleSaveAsTask = () => {
        if (!content.trim()) return;
        addTask({ title: "Mind Dump: Review", description: content, load: 'medium' });
        setContent("");
        toggleMindDump();
    };

    const handleSaveAsShard = () => {
        if (!content.trim()) return;
        forgeShard({ title: "Mind Dump Shard", content: content, files: [] });
        setContent("");
        toggleMindDump();
    };

    return (
        <AnimatePresence>
            {isMindDumpOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.95 }}
                    className="fixed top-24 right-8 z-[100001] w-80 sm:w-96 bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) rounded-3xl shadow-2xl flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 border-b border-(--border-color) bg-(--bg-sidebar)/50">
                        <div className="flex items-center gap-2">
                            <Edit3 size={16} className="text-(--accent-teal)" />
                            <span className="font-bold text-sm tracking-wide">Mind-dump</span>
                        </div>
                        <button onClick={toggleMindDump} className="text-(--text-muted) hover:text-(--text-main) p-1 rounded-md transition-colors hover:bg-(--bg-dark)">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-4 flex-1">
                        <textarea
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Get it out of your head..."
                            className="w-full h-48 bg-transparent text-(--text-main) text-sm resize-none outline-none custom-scrollbar placeholder:text-(--text-muted)/50 leading-relaxed"
                        />
                    </div>
                    <div className="p-3 border-t border-(--border-color) bg-(--bg-sidebar)/50 flex gap-2">
                        <button onClick={handleSaveAsTask} disabled={!content.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-(--bg-dark) border border-(--border-color) text-xs font-bold transition-all disabled:opacity-50">
                            <CheckSquare size={14} /> To Task
                        </button>
                        <button onClick={handleSaveAsShard} disabled={!content.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-(--accent-yellow)/10 border border-(--accent-yellow)/30 text-(--accent-yellow) text-xs font-bold transition-all disabled:opacity-50 hover:bg-(--accent-yellow) hover:text-black">
                            <Hammer size={14} /> To Shard
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

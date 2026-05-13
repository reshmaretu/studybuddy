"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

export default function ExperienceOverlay() {
    const { lastLevelUp, lastXpGain, level } = useStudyStore();
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [showXp, setShowXp] = useState(false);

    useEffect(() => {
        if (lastLevelUp) setShowLevelUp(true);
        const timer = setTimeout(() => setShowLevelUp(false), 4500);
        return () => clearTimeout(timer);
    }, [lastLevelUp]);

    useEffect(() => {
        if (lastXpGain) setShowXp(true);
        const timer = setTimeout(() => setShowXp(false), 2500);
        return () => clearTimeout(timer);
    }, [lastXpGain]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[200000] flex items-center justify-center overflow-hidden">
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
                        className="relative"
                    >
                        {/* Radiant Background */}
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-40 bg-gradient-to-r from-teal-500/20 via-amber-500/20 to-cyan-500/20 blur-3xl opacity-50 rounded-full"
                        />
                        
                        <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl border-2 border-[var(--accent-yellow)] p-12 rounded-[3.5rem] shadow-[0_0_100px_rgba(251,191,36,0.3)] text-center relative z-10">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="w-24 h-24 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
                                    <Trophy size={48} className="text-black" />
                                </div>
                                <h1 className="text-5xl font-black italic tracking-tighter text-white mb-2 uppercase">Level Up!</h1>
                                <p className="text-7xl font-black text-[var(--accent-yellow)] mb-6">{lastLevelUp || level}</p>
                                <div className="flex items-center justify-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full inline-block mx-auto">
                                    <Sparkles size={16} className="text-[var(--accent-teal)]" />
                                    <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">New Spirit Form Attained</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Particle Effects */}
                        {(() => {
                            const particles = Array.from({ length: 12 }, (_, i) => ({
                                id: i,
                                x: (Math.sin(i * 1337.42) % 1) * 600 - 300,
                                y: (Math.cos(i * 999.99) % 1) * 600 - 300,
                            }));
                            return particles.map((p) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ x: 0, y: 0, opacity: 1 }}
                                    animate={{ 
                                        x: p.x, 
                                        y: p.y,
                                        opacity: 0,
                                        scale: 0
                                    }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-amber-400"
                                />
                            ));
                        })()}
                    </motion.div>
                )}

                {showXp && !showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="absolute bottom-32 bg-[var(--accent-teal)]/10 backdrop-blur-md border border-[var(--accent-teal)]/30 px-6 py-3 rounded-2xl flex items-center gap-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal)] flex items-center justify-center text-black shadow-lg">
                            <Sparkles size={20} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">+{lastXpGain} XP</p>
                            <p className="text-[10px] font-bold text-[var(--accent-teal)] uppercase tracking-widest">Growth Synchronized</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

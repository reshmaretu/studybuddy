'use client';

import React, { useEffect } from 'react';
import { useStudyStore } from '@/store/useStudyStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const SparkBurstOverlay = () => {
    const { sparkBurst, setSparkBurst } = useStudyStore();

    useEffect(() => {
        if (!sparkBurst) return;
        const timer = setTimeout(() => setSparkBurst(null), 2500);
        return () => clearTimeout(timer);
    }, [sparkBurst, setSparkBurst]);

    return (
        <AnimatePresence>
            {sparkBurst && (
                <div className="fixed inset-0 z-[200000] pointer-events-none flex items-center justify-center overflow-hidden">
                    {/* Subtle Golden Glow */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 2.5 }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.15),transparent_70%)]"
                    />

                    <div className="relative">
                        {/* Spark Text / Announcement */}
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="bg-[var(--bg-card)]/80 backdrop-blur-2xl border-2 border-[var(--accent-yellow)] px-8 py-4 rounded-full shadow-[0_0_50px_rgba(250,204,21,0.2)] flex items-center gap-3 z-10"
                        >
                            <div className="w-8 h-8 bg-[var(--accent-yellow)] rounded-full flex items-center justify-center text-black">
                                <Sparkles size={18} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-[var(--accent-yellow)]">Spark Received!</p>
                                <p className="text-[10px] font-bold text-[var(--text-main)]">Someone ignited your feed</p>
                            </div>
                        </motion.div>

                        {/* Yellow Premium Particles */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                animate={{
                                    x: (Math.random() - 0.5) * 400,
                                    y: (Math.random() - 0.5) * 400,
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.2, 0.5],
                                    rotate: Math.random() * 360
                                }}
                                transition={{
                                    duration: 2,
                                    delay: i * 0.1,
                                    ease: "easeOut"
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            >
                                <Sparkles size={24} className="text-[var(--accent-yellow)]" fill="currentColor" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyStore } from '@/store/useStudyStore';
import { LayoutGrid, ListOrdered, List, Sparkles } from 'lucide-react';

export default function MorningPlanningModal() {
    const { setActiveFramework, isMorningModalOpen, setIsMorningModalOpen } = useStudyStore();
    const [selected, setSelected] = useState<'eisenhower' | '1-3-5' | 'ivy' | null>(null);

    const handleConfirm = async () => {
        if (!selected) return;
        setIsMorningModalOpen(false);
        await setActiveFramework(selected, new Date().toISOString());
    };

    const handleStandard = async () => {
        setIsMorningModalOpen(false);
        await setActiveFramework(null, new Date().toISOString());
    };

    return (
        <AnimatePresence>
            {isMorningModalOpen && (
                <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMorningModalOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 max-w-lg w-full flex flex-col my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
                        id="morning-protocol-nexus"
                    >
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/20 mb-4 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                                <Sparkles size={24} className="text-[var(--accent-teal)] animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Good Morning! ☀️</h2>
                            <p className="text-[var(--text-muted)] text-xs md:text-sm">A new day has dawned. How would you like to structure your quests today?</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            {/* Eisenhower Matrix */}
                            <button
                                onClick={() => setSelected('eisenhower')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${selected === 'eisenhower'
                                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 shadow-[0_0_20px_rgba(20,184,166,0.15)]'
                                    : 'border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--text-muted)]'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl transition-colors ${selected === 'eisenhower' ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
                                    <LayoutGrid size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-[var(--text-main)] text-sm md:text-base">Eisenhower Matrix</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Focus on what&apos;s Urgent vs Important.</p>
                                </div>
                            </button>

                            {/* 1-3-5 Rule */}
                            <button
                                onClick={() => setSelected('1-3-5')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${selected === '1-3-5'
                                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 shadow-[0_0_20px_rgba(20,184,166,0.15)]'
                                    : 'border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--text-muted)]'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl transition-colors ${selected === '1-3-5' ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
                                    <List size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-[var(--text-main)] text-sm md:text-base">1-3-5 Rule</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Tackle 1 Heavy, 3 Medium, and 5 Light tasks.</p>
                                </div>
                            </button>

                            {/* Ivy Lee Method */}
                            <button
                                onClick={() => setSelected('ivy')}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${selected === 'ivy'
                                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 shadow-[0_0_20px_rgba(20,184,166,0.15)]'
                                    : 'border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--text-muted)]'
                                    }`}
                            >
                                <div className={`p-3 rounded-xl transition-colors ${selected === 'ivy' ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
                                    <ListOrdered size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-[var(--text-main)] text-sm md:text-base">Ivy Lee Method</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">List your top 6 priorities and do them in strict order.</p>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!selected}
                            className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] text-[#0b1211] font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(20,184,166,0.3)] disabled:opacity-50 disabled:shadow-none transition-all hover:brightness-110 active:scale-[0.98]"
                        >
                            Start the Day
                        </button>

                        <button
                            onClick={handleStandard}
                            className="w-full mt-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            Continue with Standard List
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

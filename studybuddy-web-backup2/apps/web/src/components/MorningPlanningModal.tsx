import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudyStore } from '@/store/useStudyStore';
import { LayoutGrid, ListOrdered, List } from 'lucide-react';

export default function MorningPlanningModal() {
    const { setActiveFramework, setLastPlannedDate } = useStudyStore();
    const [selected, setSelected] = useState<'eisenhower' | '1-3-5' | 'ivy' | null>(null);

    const handleConfirm = () => {
        if (!selected) return;
        setActiveFramework(selected);
        setLastPlannedDate(new Date().toISOString());
        useStudyStore.getState().setIsMorningModalOpen(false);
    };

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-[#0b1211]/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-(--bg-card) border border-(--border-color) rounded-3xl p-8 max-w-lg w-full shadow-2xl"
                id="morning-protocol-nexus"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-(--text-main) mb-2">Good Morning! ☀️</h2>
                    <p className="text-(--text-muted) text-sm">A new day has dawned. How would you like to structure your quests today?</p>
                </div>

                <div className="space-y-4 mb-8">
                    {/* Eisenhower Matrix */}
                    <button
                        onClick={() => setSelected('eisenhower')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selected === 'eisenhower'
                            ? 'border-(--accent-teal) bg-(--accent-teal)/10'
                            : 'border-(--border-color) bg-(--bg-dark) hover:border-(--text-muted)'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${selected === 'eisenhower' ? 'bg-(--accent-teal) text-[#0b1211]' : 'bg-(--bg-sidebar) text-(--text-muted)'}`}>
                            <LayoutGrid size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-(--text-main)">Eisenhower Matrix</h3>
                            <p className="text-xs text-(--text-muted) mt-0.5">Focus on what&apos;s Urgent vs Important.</p>
                        </div>
                    </button>

                    {/* 1-3-5 Rule */}
                    <button
                        onClick={() => setSelected('1-3-5')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selected === '1-3-5'
                            ? 'border-(--accent-teal) bg-(--accent-teal)/10'
                            : 'border-(--border-color) bg-(--bg-dark) hover:border-(--text-muted)'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${selected === '1-3-5' ? 'bg-(--accent-teal) text-[#0b1211]' : 'bg-(--bg-sidebar) text-(--text-muted)'}`}>
                            <List size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-(--text-main)">1-3-5 Rule</h3>
                            <p className="text-xs text-(--text-muted) mt-0.5">Tackle 1 Heavy, 3 Medium, and 5 Light tasks.</p>
                        </div>
                    </button>

                    {/* Ivy Lee Method */}
                    <button
                        onClick={() => setSelected('ivy')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selected === 'ivy'
                            ? 'border-(--accent-teal) bg-(--accent-teal)/10'
                            : 'border-(--border-color) bg-(--bg-dark) hover:border-(--text-muted)'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${selected === 'ivy' ? 'bg-(--accent-teal) text-[#0b1211]' : 'bg-(--bg-sidebar) text-(--text-muted)'}`}>
                            <ListOrdered size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-(--text-main)">Ivy Lee Method</h3>
                            <p className="text-xs text-(--text-muted) mt-0.5">List your top 6 priorities and do them in strict order.</p>
                        </div>
                    </button>

                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!selected}
                    className="w-full py-3 rounded-xl bg-(--accent-teal) text-[#0b1211] font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
                >
                    Start the Day
                </button>

                <button
                    onClick={() => {
                        setActiveFramework(null); // Explicitly disable frameworks
                        setLastPlannedDate(new Date().toISOString());
                    }}
                    className="w-full mt-4 py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-main) transition-colors"
                >
                    Continue with Standard List
                </button>
            </motion.div>
        </div>
    );
}

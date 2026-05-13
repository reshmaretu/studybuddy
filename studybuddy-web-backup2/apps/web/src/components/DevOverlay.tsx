"use client";

import { useState, useEffect, useRef } from "react";
import { useStudyStore, LanternUser } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, RefreshCw, ShieldAlert, Skull, CheckCircle2, BrainCircuit, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
export default function DevOverlay() {
    const {
        isDev, setLastPlannedDate,
        debrisSize, debrisColor, debrisCount, debrisSpread, setDebris,
        windSpeed, swayAmount, setWindSettings,
        triggerChumToast,
        mockUsers, setMockUsers,
        enableDevRoomOptions, setEnableDevRoomOptions
    } = useStudyStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isNuking, setIsNuking] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isDev && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDev]);

    const generateMockUser = (id: string): LanternUser => {
        const statuses = ['idle', 'drafting', 'hosting', 'joined', 'flowState', 'cafe', 'mastering', 'offline'] as const;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isHosting = status === 'hosting' || status === 'drafting';
        const spread = 15;

        return {
            id: `mock-${id}`,
            name: `Bot ${id}`,
            chumLabel: "🤖 Bot",
            focusScore: Math.floor(Math.random() * 5000),
            status,
            hours: Math.floor(Math.random() * 500),
            isPremium: Math.random() > 0.5,
            isHosting,
            roomCode: isHosting ? `MCK${id.substring(0, 3)}` : undefined,
            roomTitle: isHosting ? `Mock Sanctuary ${id}` : undefined,
            gridX: Math.floor(Math.random() * spread) - 2,
            gridY: Math.floor(Math.random() * spread) - 2,
            gridZ: Math.floor(Math.random() * spread) - 2,
            jitterX: (Math.random() - 0.5) * 40,
            jitterY: (Math.random() - 0.5) * 40,
            jitterZ: (Math.random() - 0.5) * 40,
        };
    };

    const forceMorningReset = async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(3, 59, 0, 0);

        await setLastPlannedDate(yesterday.toISOString());
        toast.info("Dev: Morning reset forced. Refresh or change page to see modal.");
        setIsOpen(false);
    };

    // --- THE DESTRUCTIVE DATABASE WIPE ---
    const handleNukeData = async () => {
        if (!window.confirm("CRITICAL WARNING: This will permanently wipe all your quests, shards, and neural history. Proceed?")) return;
        if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;

        setIsNuking(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user?.id) {
                await Promise.all([
                    supabase.from('tasks').delete().eq('user_id', session.user.id),
                    supabase.from('shards').delete().eq('user_id', session.user.id),
                    supabase.from('tutor_sessions').delete().eq('user_id', session.user.id)
                ]);
            }

            // Flush local state
            useStudyStore.setState({
                tasks: [],
                shards: [],
                normalChatHistory: [],
                tutorChatHistory: [],
                pastTutorSessions: [],
                activeShardId: null,
            });

            if (triggerChumToast) {
                triggerChumToast("Neural link severed. All systems wiped and restarted.", "warning");
            }
            toast.success("Database nuked successfully.");
            setIsOpen(false);
        } catch (err) {
            console.error("Failed to wipe database:", err);
            toast.error("Nuke failed. Check console for details.");
        } finally {
            setIsNuking(false);
        }
    };

    if (!isDev) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="bg-(--bg-card) border-2 border-red-500/50 p-6 rounded-[32px] shadow-[0_0_50px_rgba(255,0,0,0.3)] w-full max-w-md pointer-events-auto max-h-[80vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2 text-red-400">
                                <ShieldAlert size={18} />
                                <h2 className="font-black text-xs tracking-widest uppercase">Architect Console</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-(--text-muted) hover:text-white p-2">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-(--bg-dark) border border-(--border-color) p-4 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-(--text-main)">System Tools</span>
                                    <Terminal size={14} className="text-(--text-muted)" />
                                </div>
                                <button
                                    onClick={forceMorningReset}
                                    className="w-full py-3 bg-(--bg-sidebar) border border-(--border-color) text-(--text-main) rounded-xl text-xs font-bold hover:border-(--accent-teal) transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} /> Force Morning Reset
                                </button>

                                <div className="flex justify-between items-center pt-2 border-t border-(--border-color)">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">Enclave Status</span>
                                        <span className="text-[8px] text-(--text-muted) font-medium italic">Enable hidden room blueprints</span>
                                    </div>
                                    <div 
                                        onClick={() => setEnableDevRoomOptions(!enableDevRoomOptions)}
                                        className={`w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300 cursor-pointer ${enableDevRoomOptions ? 'bg-red-500' : 'bg-(--bg-card) border border-(--border-color)'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full transition-transform duration-300 ${enableDevRoomOptions ? 'translate-x-5 bg-white' : 'translate-x-0 bg-(--text-muted)'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-(--bg-dark) border border-(--border-color) p-4 rounded-2xl space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Network Mocks (Lantern)</h3>
                                <div className="flex justify-between items-center bg-(--bg-sidebar) px-4 py-3 rounded-xl border border-(--border-color)">
                                    <span className="text-xs font-bold text-(--text-main)">Mock User Count</span>
                                    <div className="flex gap-3 items-center">
                                        <button onClick={() => setMockUsers(mockUsers.slice(0, Math.max(0, mockUsers.length - 1)))} className="w-6 h-6 rounded bg-(--border-color) flex items-center justify-center font-bold text-xs hover:text-(--accent-teal)">-</button>
                                        <span className="text-xs font-mono w-4 text-center">{mockUsers.length}</span>
                                        <button onClick={() => setMockUsers([...mockUsers, generateMockUser(Math.random().toString(36).substring(2, 6))])} className="w-6 h-6 rounded bg-(--border-color) flex items-center justify-center font-bold text-xs hover:text-(--accent-teal)">+</button>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    setMockUsers(mockUsers.map(u => generateMockUser(u.id.replace('mock-', ''))));
                                }} className="w-full py-2 bg-(--bg-sidebar) border border-(--border-color) rounded-xl text-xs font-bold hover:border-red-500/50 transition-colors">
                                    Randomize Bot Vectors
                                </button>
                            </div>

                            <div className="bg-(--bg-dark) border border-(--border-color) p-4 rounded-2xl space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Atmosphere (Lantern Net)</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Wind Speed</span>
                                        <span className="font-mono text-red-400">{windSpeed.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="0" max="10" step="0.1" value={windSpeed} onChange={(e) => setWindSettings({ windSpeed: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Wind Sway</span>
                                        <span className="font-mono text-red-400">{swayAmount.toFixed(2)}</span>
                                    </div>
                                    <input type="range" min="0" max="1.0" step="0.01" value={swayAmount} onChange={(e) => setWindSettings({ swayAmount: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Size</span>
                                        <span className="font-mono text-red-400">{debrisSize.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="0.1" max="2.0" step="0.1" value={debrisSize} onChange={(e) => setDebris({ size: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Count</span>
                                        <span className="font-mono text-red-400">{debrisCount}</span>
                                    </div>
                                    <input type="range" min="1000" max="15000" step="1000" value={debrisCount} onChange={(e) => setDebris({ count: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Spread</span>
                                        <span className="font-mono text-red-400">{debrisSpread}</span>
                                    </div>
                                    <input type="range" min="100" max="1000" step="50" value={debrisSpread} onChange={(e) => setDebris({ spread: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Color</span>
                                        <input type="color" value={debrisColor} onChange={(e) => setDebris({ color: e.target.value })} className="w-6 h-6 bg-transparent border-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>

                            {/* DANGER ZONE */}
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col gap-3">
                                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-widest">Danger Zone</h3>
                                <button
                                    onClick={handleNukeData}
                                    disabled={isNuking}
                                    className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isNuking ? <RefreshCw className="animate-spin" size={14} /> : <Skull size={14} />}
                                    {isNuking ? "Wiping Systems..." : "Nuke Database"}
                                </button>
                            </div>

                            <div className="p-3 bg-black/20 rounded-xl">
                                <p className="text-[10px] text-(--text-muted) leading-relaxed italic text-center">
                                    &quot;With great power comes great responsibility, Chum.&quot;
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, CheckCircle2, Sparkles, X, Download } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PremiumModal() {
    const { 
        isPremiumModalOpen, setPremiumModalOpen, isPremiumUser, 
        mockInvoices, setPremiumStatus, addMockInvoice 
    } = useStudyStore();
    const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
    const router = useRouter();

    const handleClose = () => {
        setPremiumModalOpen(false);
        setTimeout(() => setStep('info'), 300);
    };

    const handleUpgrade = () => {
        setStep('payment');
        // Mock payment processing
        setTimeout(() => {
            const newInvoice = {
                id: `INV-${Math.random().toString(36).substring(7).toUpperCase()}`,
                date: new Date().toLocaleDateString(),
                amount: "₱99.00",
                method: "GCash",
                items: ["StudyBuddy Pro - Seasonal Pass"]
            };
            setPremiumStatus(true);
            addMockInvoice(newInvoice);
            setStep('success');
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isPremiumModalOpen && (
                <div className="fixed inset-0 z-[100006] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={handleClose} 
                        className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 40 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-(--bg-sidebar) border border-(--border-color) rounded-[40px] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button onClick={handleClose} className="absolute top-6 right-6 text-(--text-muted) hover:text-(--text-main) p-2 hover:bg-(--bg-dark) rounded-xl transition-all z-20">
                            <X size={20} />
                        </button>

                        <div className="p-8 lg:p-12">
                            {step === 'info' && (
                                <div className="space-y-8 flex flex-col items-center">
                                    <div className="p-8 bg-white/5 rounded-full text-(--accent-yellow) relative group overflow-hidden border border-(--accent-yellow)/20">
                                        <Crown size={64} className="drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] relative z-10 animate-bounce" style={{ animationDuration: '3s' }} />
                                        <div className="absolute inset-0 bg-(--accent-yellow)/5 blur-3xl rounded-full" />
                                    </div>
                                    
                                    <div className="text-center space-y-3">
                                        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-(--text-main)">
                                            {isPremiumUser ? "Ascendant Soul" : "Sprout Guardian"}
                                        </h2>
                                        <p className="text-[10px] font-black text-(--accent-teal) uppercase tracking-[0.3em] opacity-60">
                                            {isPremiumUser ? "Eternal Garden Access Active" : "Evolve your neural sanctuary"}
                                        </p>
                                    </div>

                                    <div className="w-full space-y-4">
                                        <div className="p-8 rounded-[32px] bg-(--bg-dark)/50 border border-white/5 space-y-5">
                                            {[
                                                "Infinite Knowledge Shards",
                                                "Priority Forge Pipelines",
                                                "Elite Chum Wardrobe",
                                                "Advanced Neural Analytics"
                                            ].map((feature, i) => (
                                                <div key={i} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-(--text-main)">
                                                    <div className="w-2 h-2 rounded-full bg-(--accent-teal) shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>

                                        {!isPremiumUser ? (
                                            <button
                                                onClick={handleUpgrade}
                                                className="w-full py-6 bg-white text-black rounded-[32px] text-xs font-black uppercase hover:bg-(--accent-teal) hover:text-white transition-all shadow-[0_20px_40px_-10px_rgba(45,212,191,0.3)] active:scale-95"
                                            >
                                                Tend the Garden (₱99)
                                            </button>
                                        ) : (
                                            <div className="space-y-4 text-center">
                                                <div className="flex items-center justify-center gap-2 text-emerald-400">
                                                    <CheckCircle2 size={18} />
                                                    <span className="text-xs font-black uppercase tracking-widest">Protocol Active</span>
                                                </div>
                                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Welcome back to the eternal archives.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {step === 'payment' && (
                                <div className="space-y-10 py-12 flex flex-col items-center justify-center">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-(--accent-teal)/20 border-t-(--accent-teal) rounded-full animate-spin" />
                                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-(--accent-yellow) animate-pulse" size={24} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-(--text-main)">Neural Transaction</h3>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">Synchronizing with Payment Relay...</p>
                                    </div>
                                </div>
                            )}

                            {step === 'success' && (
                                <div className="space-y-8 flex flex-col items-center py-6">
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-(--text-main)">Soul Synchronized</h3>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">Your garden has expanded into the infinite.</p>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="w-full py-6 bg-emerald-500 text-black rounded-[32px] text-xs font-black uppercase hover:bg-emerald-400 transition-all shadow-2xl"
                                    >
                                        Enter the Sanctuary
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

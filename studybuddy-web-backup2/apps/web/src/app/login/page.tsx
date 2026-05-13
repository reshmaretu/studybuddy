"use client";

import { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStudyStore } from '@/store/useStudyStore';
import { Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import GeodeScene from '@/components/GeodeScene';

import { useTerms } from "@/hooks/useTerms";

export default function Login() {
    const router = useRouter();
    const resetStore = useStudyStore((state) => state.reset);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [message, setMessage] = useState<{ text: string; show: boolean, type?: string }>({ text: '', show: false, type: '' });
    const [loading, setLoading] = useState<boolean>(false);
    const { useThematicUI } = useStudyStore();
    const [showPassword, setShowPassword] = useState(false);

    const expoEase = [0.16, 1, 0.3, 1] as const;

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: expoEase } }
    };

    const triggerChumToast = (text: string, type: 'success' | 'error') => {
        setMessage({ text, show: true, type });
        setTimeout(() => setMessage({ text: '', show: false, type: '' }), 3000);
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            triggerChumToast(error.message || "Invalid credentials.", 'error');
        } else {
            triggerChumToast("Sync successful. Routing to Hub...", 'success');
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        }
        setLoading(false);
    };

    return (
        <div className="full-page-container flex h-screen bg-[#05080c] text-white">
            <main className="flex-1 flex items-center justify-center p-8 relative">

                {/* 🛑 DEMO ESCAPE HATCH (BACK BUTTON) */}
                <button
                    onClick={() => router.push('/')}
                    className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#84ccb9] transition-all group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back
                </button>

                <div className="w-full max-w-md space-y-8 mt-8 sm:mt-0">
                    <div className="text-center">
                        <h1 className="text-3xl font-black">Welcome back!</h1>
                        <p className="text-white/50 text-sm mt-2">Simplify your workflow with <strong>StudyBuddy</strong>.</p>
                    </div>

                    {message.show && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-[#84ccb9]/10 text-[#84ccb9]' : 'bg-red-500/10 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 pr-12 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex justify-center pt-1">
                            <Link href="/reset-password" className="text-[10px] font-black uppercase tracking-widest text-[#84ccb9] hover:underline">
                                Lost your key? Dispatch recovery relay
                            </Link>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#84ccb9] text-black rounded-xl font-black mt-4 hover:scale-[1.02] transition-transform disabled:opacity-50">
                            {loading
                                ? (useThematicUI ? "Initiating Sync..." : "Logging In...")
                                : (useThematicUI ? "Initiate Sync" : "Login")
                            }
                        </button>
                    </form>

                    {/* SOCIAL DIVIDER */}
                    <div className="flex items-center gap-4 my-6 opacity-50">
                        <div className="flex-1 h-px bg-white/20"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Or continue with</span>
                        <div className="flex-1 h-px bg-white/20"></div>
                    </div>

                    {/* SOCIAL BUTTONS */}
                    <div className="flex justify-center gap-4">
                        <button className="w-12 h-12 rounded-full bg-[#111111] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors font-bold text-white/70">G</button>
                        <button className="w-12 h-12 rounded-full bg-[#111111] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors font-bold text-white/70">A</button>
                        <button className="w-12 h-12 rounded-full bg-[#111111] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors font-bold text-white/70">F</button>
                    </div>

                    <p className="text-center text-sm text-white/40 mt-8">
                        Not a member? <Link href="/register" className="text-[#84ccb9] font-bold">Register now</Link>
                    </p>
                </div>
            </main>

            <section className="promo-section">
                <div className="promo-inner">
                    {/* RIGHT: The Actual 3D Scene */}
                    {/* 🔥 Added w-full max-w-md mx-auto to make it larger and centered 🔥 */}
                    <motion.div variants={itemVariants} className="w-full max-w-md mx-auto bg-[#111] border-2 border-[#3E353B] rounded-[2.5rem] p-3 shadow-[0_0_50px_rgba(120,155,140,0.15)] group relative">

                        {/* 3D Scene Wrapper */}
                        {/* 🔥 Changed aspect-video to aspect-[3/4] to make it portrait 🔥 */}
                        <div className="relative w-full aspect-[3/4] bg-[#09080c] rounded-[1.8rem] overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] border border-white/5">

                            {/* The Header Overlay */}
                            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                            </div>

                            {/* 🟢 THE 3D CANVAS INTEGRATION 🟢 */}
                            <div className="w-full h-full">
                                <GeodeScene completionRatio={0.96} />
                            </div>

                            {/* Interaction Hint */}
                            <div className="absolute bottom-6 left-6 z-10">
                                <div className="bg-black/40 backdrop-blur-md text-white/50 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-white/5 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#789B8C] animate-pulse" />
                                    Interact to explore
                                </div>
                            </div>
                        </div>

                        {/* Premium Decorative Glow */}
                        <div className="absolute -inset-4 bg-[#789B8C]/5 blur-[100px] rounded-full pointer-events-none -z-10 group-hover:bg-[#789B8C]/10 transition-all duration-700" />
                    </motion.div>
                    <h2>Make your work easier with <strong>StudyBuddy</strong></h2>
                </div>
            </section>
        </div>
    );
}
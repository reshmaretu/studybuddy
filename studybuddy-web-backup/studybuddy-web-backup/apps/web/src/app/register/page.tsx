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
import PasswordValidator from '@/components/PasswordValidator';

import { useTerms } from "@/hooks/useTerms";

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fName: '',
        lName: '',
        displayName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ text: '', show: false, type: '' });
    const [loading, setLoading] = useState(false);

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

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setMessage({ text: "Passwords do not match!", show: true, type: 'error' });
            return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.fName,
                    last_name: formData.lName,
                    display_name: formData.displayName,
                    full_name: `${formData.fName} ${formData.lName}`
                }
            }
        });
        if (error) {
            setMessage({ text: error.message, show: true, type: 'error' });
        } else {
            setMessage({ text: "Success! Redirecting to login...", show: true, type: 'success' });
            setTimeout(() => {
                router.push('/login');
            }, 3000);
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
                        <h1 className="text-3xl font-black">Create Account</h1>
                        <p className="text-white/50 text-sm mt-2">Join <strong>StudyBuddy</strong> today and start organizing your workflow for free.</p>
                    </div>
                    {message.show && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-[#84ccb9]/10 text-[#84ccb9]' : 'bg-red-500/10 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="First Name"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, fName: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, lName: e.target.value })}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Display Name (Optional)"
                            className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#84ccb9]/50 transition-all"
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />

                        {/* Password with visibility toggle */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 pr-12 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                            />
                            <PasswordValidator password={formData.password} isVisible={isPasswordFocused} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Confirm Password with visibility toggle */}
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                required
                                className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 pr-12 outline-none focus:border-[#84ccb9]/50 transition-all"
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#84ccb9] text-black rounded-xl font-black mt-4 hover:scale-[1.02] transition-transform disabled:opacity-50">
                            {loading ? "Creating Account..." : "Sign Up"}
                        </button>
                    </form>
                    <p className="text-center text-sm text-white/40">
                        Already a member? <Link href="/login" className="text-[#84ccb9] font-bold">Login here</Link>
                    </p>
                </div>
            </main>
            <section className="promo-section">
                <div className="promo-inner">
                    <div className="w-full max-w-xl flex flex-col items-center gap-12 z-10">
                        <motion.div
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            variants={containerVariants}
                            className="w-full"
                        >
                            {/* 🔥 PORTRAIT CONTAINER: max-w-md and aspect-[3/4] 🔥 */}
                            <motion.div
                                variants={itemVariants}
                                className="w-full max-w-md mx-auto bg-[#111111] border-2 border-[#3E353B] rounded-[3rem] aspect-[3/4] shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                                    {/* SVG Animated Paths */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                                        <motion.line
                                            initial={{ pathLength: 0 }}
                                            whileInView={{ pathLength: 1 }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                            x1="25%" y1="30%" x2="70%" y2="70%"
                                            stroke="#00ffff" strokeWidth="2" strokeDasharray="6 6"
                                        />
                                        <motion.line
                                            initial={{ pathLength: 0 }}
                                            whileInView={{ pathLength: 1 }}
                                            transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                            x1="25%" y1="30%" x2="85%" y2="50%"
                                            stroke="#ffcc00" strokeWidth="2" strokeDasharray="6 6"
                                        />
                                    </svg>

                                    {/* Animated Nodes */}
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        className="absolute w-6 h-6 bg-[#00ffff] rounded-full shadow-[0_0_40px_#00ffff] -translate-x-1/2 -translate-y-1/2"
                                        style={{ top: '30%', left: '25%' }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                                        className="absolute w-5 h-5 bg-[#c084fc] rounded-full shadow-[0_0_30px_#c084fc] -translate-x-1/2 -translate-y-1/2"
                                        style={{ top: '70%', left: '70%' }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                                        className="absolute w-4 h-4 bg-[#ffcc00] rounded-full shadow-[0_0_20px_#ffcc00] -translate-x-1/2 -translate-y-1/2"
                                        style={{ top: '50%', left: '85%' }}
                                    />

                                    {/* Status Overlay */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="absolute bottom-10 left-8 bg-[#000000]/80 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-2xl flex items-center gap-4"
                                    >
                                        <div className="w-3 h-3 bg-[#00ffff] rounded-full animate-ping" />
                                        <div className="flex flex-col">
                                            <div className="text-sm font-black text-white uppercase tracking-tighter">Architect's Sanctuary</div>
                                            <div className="text-xs text-[#00ffff] tracking-widest uppercase font-bold">● FlowState Active</div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                    <h2>The smartest way to manage your studies.</h2>
                </div>
            </section>
        </div>
    );
}
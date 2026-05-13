"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return setMessage({ text: "Ciphers do not match.", type: "warning" });
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setMessage({ text: error.message, type: "warning" });
        } else {
            setMessage({ text: "Cipher rewritten. Redirecting...", type: "success" });
            setTimeout(() => router.push("/login"), 2000);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-teal-400/10 rounded-2xl border border-teal-400/20 mb-4">
                        <Lock className="text-teal-400" size={32} />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter italic">Rewrite Cipher</h1>
                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-2">Update your neural access key</p>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-[10px] font-bold uppercase mb-6 text-center border ${message.type === 'success' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="NEW PASSWORD"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-teal-400"
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-5 text-white/30">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="CONFIRM NEW PASSWORD"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-teal-400"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <button type="submit" disabled={loading} className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase hover:bg-teal-400 transition-all shadow-xl">
                        {loading ? "Syncing..." : "Finalize Rewrite"}
                    </button>
                </form>
            </div>
        </div>
    );
}
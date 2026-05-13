"use client";

import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordValidatorProps {
    password: string;
    isVisible: boolean;
}

export default function PasswordValidator({ password, isVisible }: PasswordValidatorProps) {
    const requirements = [
        { label: "Minimum 8 characters", valid: password.length >= 8 },
        { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
        { label: "At least one number", valid: /[0-9]/.test(password) },
        { label: "At least one special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute z-50 top-full mt-2 w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-2xl shadow-2xl backdrop-blur-xl"
                >
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-3">Cipher Strength Required</p>
                        {requirements.map((req, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${req.valid ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    {req.valid ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={4} />}
                                </div>
                                <span className={`text-[10px] font-bold transition-colors ${req.valid ? 'text-green-400' : 'text-red-400/60'}`}>
                                    {req.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className={`h-full transition-all duration-500 ${
                                requirements.filter(r => r.valid).length === requirements.length ? 'bg-green-500' : 'bg-amber-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(requirements.filter(r => r.valid).length / requirements.length) * 100}%` }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

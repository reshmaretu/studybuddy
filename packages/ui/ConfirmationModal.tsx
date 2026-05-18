"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { SquishyButton } from "./SquishyButton";

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean;
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isDangerous = false
}: ConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100006] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-5 md:p-6 shadow-2xl relative z-10 w-full max-w-md flex flex-col my-auto max-h-[90vh]"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button onClick={onCancel} className="absolute top-5 right-5 text-(--text-muted) hover:text-(--text-main) p-1.5 hover:bg-(--bg-dark) rounded-xl transition-all z-20">
                            <X size={20} />
                        </button>

                        <div className="flex items-start gap-3 mb-6">
                            <div className={`p-4 rounded-full flex-shrink-0 border ${isDangerous ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-[var(--accent-teal)]/20'}`}>
                                {isDangerous ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                            </div>
                            <div className="flex flex-col justify-center pt-1">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-(--text-main)">
                                    {title}
                                </h2>
                                <p className="text-[10px] font-black text-(--accent-teal) uppercase tracking-[0.2em] opacity-60">
                                    {isDangerous ? "Irreversible Action" : "Confirmation Required"}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs md:text-sm text-(--text-muted) mb-8 leading-relaxed font-medium">
                            {message}
                        </p>

                        <div className="flex gap-4">
                            <SquishyButton
                                onClick={onCancel}
                                className="flex-1 py-4 px-6 bg-(--bg-dark) border border-(--border-color) rounded-2xl text-(--text-main) font-black uppercase text-xs tracking-wider hover:bg-(--border-color) transition-all shadow-md active:scale-95"
                            >
                                {cancelText}
                            </SquishyButton>
                            <SquishyButton
                                onClick={onConfirm}
                                className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl active:scale-95 ${
                                    isDangerous
                                        ? 'bg-red-500 text-black hover:bg-red-400 shadow-[0_10px_20px_rgba(239,68,68,0.3)]'
                                        : 'bg-[var(--accent-teal)] text-black hover:bg-[var(--accent-teal)]/80 shadow-[0_10px_20px_rgba(20,184,166,0.3)]'
                                }`}
                            >
                                {confirmText}
                            </SquishyButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}

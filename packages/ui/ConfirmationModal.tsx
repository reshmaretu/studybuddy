"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-card) border border-(--border-color) rounded-2xl md:rounded-3xl p-3 md:p-8 max-w-[calc(100vw-1rem)] md:max-w-sm w-full shadow-2xl z-[1000]"
                    >
                        <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                            <div className={`p-2 md:p-3 rounded-full flex-shrink-0 ${isDangerous ? 'bg-red-500/20' : 'bg-[var(--accent-teal)]/20'}`}>
                                <CheckCircle2 size={18} className={`md:w-6 md:h-6 ${isDangerous ? 'text-red-400' : 'text-[var(--accent-teal)]'}`} />
                            </div>
                            <h2 className="text-sm md:text-xl font-black uppercase tracking-wider text-(--text-main)">
                                {title}
                            </h2>
                        </div>

                        <p className="text-xs md:text-sm text-(--text-muted) mb-4 md:mb-8 leading-relaxed">
                            {message}
                        </p>

                        <div className="flex gap-2 md:gap-4">
                            <SquishyButton
                                onClick={onCancel}
                                className="flex-1 py-2 md:py-3 px-2 md:px-4 bg-(--bg-dark) border border-(--border-color) rounded-lg md:rounded-xl text-(--text-main) font-bold uppercase text-[10px] md:text-sm tracking-wider hover:bg-(--border-color) transition-colors"
                            >
                                {cancelText}
                            </SquishyButton>
                            <SquishyButton
                                onClick={onConfirm}
                                className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-lg md:rounded-xl font-bold uppercase text-[10px] md:text-sm tracking-wider transition-colors ${
                                    isDangerous
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                        : 'bg-[var(--accent-teal)] text-black border border-[var(--accent-teal)]/50 hover:bg-[var(--accent-teal)]/80'
                                }`}
                            >
                                {confirmText}
                            </SquishyButton>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

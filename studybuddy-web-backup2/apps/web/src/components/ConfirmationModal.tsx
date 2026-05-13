"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { SquishyButton } from "@studybuddy/ui";

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

export default function ConfirmationModal({
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
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-card) border border-(--border-color) rounded-3xl p-8 max-w-sm w-full shadow-2xl z-[1000]"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-500/20' : 'bg-[var(--accent-teal)]/20'}`}>
                                <CheckCircle2 size={24} className={isDangerous ? 'text-red-400' : 'text-[var(--accent-teal)]'} />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-wider text-(--text-main)">
                                {title}
                            </h2>
                        </div>

                        <p className="text-sm text-(--text-muted) mb-8 leading-relaxed">
                            {message}
                        </p>

                        <div className="flex gap-4">
                            <SquishyButton
                                onClick={onCancel}
                                className="flex-1 py-3 px-4 bg-(--bg-dark) border border-(--border-color) rounded-xl text-(--text-main) font-bold uppercase text-sm tracking-wider hover:bg-(--border-color) transition-colors"
                            >
                                {cancelText}
                            </SquishyButton>
                            <SquishyButton
                                onClick={onConfirm}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase text-sm tracking-wider transition-colors ${
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

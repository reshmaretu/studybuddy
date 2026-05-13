"use client";

import Link from "next/link";
import { MoveLeft, Ghost } from "lucide-react";
import { motion } from "framer-motion";

export const dynamic = 'force-dynamic';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-(--bg-dark) flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full text-center space-y-8"
            >
                <div className="relative inline-block">
                    <motion.div
                        animate={{ 
                            y: [0, -20, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <Ghost size={120} className="text-(--accent-teal) opacity-20 mx-auto" strokeWidth={1} />
                    </motion.div>
                    <h1 className="absolute inset-0 flex items-center justify-center text-7xl font-black text-white/10 select-none">404</h1>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Lost in the Void?</h2>
                    <p className="text-(--text-muted) font-medium leading-relaxed">
                        This coordinate doesn't seem to exist in the sanctuary. Maybe the wind blew it away, or you've discovered a hidden node.
                    </p>
                </div>

                <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-(--accent-teal) transition-all active:scale-95 group shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                    <MoveLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Return to Sanctuary
                </Link>

                <div className="pt-12 flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-white/5">
                    <span>Coordinate Invalid</span>
                    <span>Node Null</span>
                    <span>Void Detected</span>
                </div>
            </motion.div>
        </div>
    );
}

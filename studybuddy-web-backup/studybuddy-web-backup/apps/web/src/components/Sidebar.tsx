"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { playTick } from "@/lib/sound";
import { useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
    LayoutGrid, Sprout, Palette, Coffee, Waves, Calendar,
    BookOpen, BarChart3, Shirt, Settings, LogOut, Radio, MoreHorizontal, X
} from "lucide-react";
import { useTerms } from "@/hooks/useTerms";
import { SquishyButton } from "@studybuddy/ui";

export default function Sidebar() {
    const pathname = usePathname();

    const { terms, isGamified } = useTerms();

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
        { name: "Crystal Garden", href: "/garden", icon: Sprout },
        { name: "Lantern Network", href: "/lantern", icon: Radio },
        { name: "Flow Canvas", href: "/canvas", icon: Palette },
        { name: terms.questForecast, href: "/calendar", icon: Calendar },
        { name: "Archive", href: "/archive", icon: BookOpen },
        { name: "Insights", href: "/insights", icon: BarChart3 },
        { name: "Wardrobe", href: "/wardrobe", icon: Shirt },
    ];

    const { activeMode } = useStudyStore();
    const [shakeWardrobe, setShakeWardrobe] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isCafe = activeMode === 'studyCafe';

    const handleWardrobeClick = (e: React.MouseEvent) => {
        if (isCafe) {
            e.preventDefault();
            setShakeWardrobe(true);
            setTimeout(() => setShakeWardrobe(false), 300);
        }
    };

    return (
        <>
            {/* --- DESKTOP SIDEBAR --- */}
            <nav className="h-screen w-[80px] hover:w-[240px] bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 z-50 overflow-hidden group hidden md:flex flex-col shrink-0" style={{ willChange: 'width' }}>
                <div className="w-full h-full flex flex-col justify-between py-6">
                    <div className="flex flex-col gap-4">
                        <Link href="/" className="flex items-center h-12 mx-2 mb-4 cursor-pointer rounded-xl hover:bg-white/5 transition-colors overflow-hidden">
                            <div className="w-[64px] flex-shrink-0 flex items-center justify-center">
                                <div className="w-10 h-10 bg-[var(--accent-teal)] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                    <Image src="/assets/CHUM-LOGO.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <span className="font-bold text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-[var(--text-main)]">StudyBuddy</span>
                        </Link>

                        <div className="flex flex-col gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                const isWardrobe = item.name === "Wardrobe";
                                return (
                                    <motion.div
                                        key={item.name}
                                        whileHover={{ scale: 1.05, x: 4 }}
                                        whileTap={{ scale: 0.9, rotate: -1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <Link 
                                            href={isWardrobe && isCafe ? "#" : item.href} 
                                            onClick={isWardrobe ? (e) => { handleWardrobeClick(e); playTick(); } : playTick} 
                                            className={`flex items-center h-12 mx-2 rounded-lg transition-all overflow-hidden whitespace-nowrap ${isActive ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5"} ${isWardrobe && isCafe ? "cursor-not-allowed" : ""} ${isWardrobe && shakeWardrobe ? "animate-premium-shake" : ""}`}
                                        >
                                            <div className="w-[64px] flex-shrink-0 flex items-center justify-center">
                                                <Icon size={20} className={isActive ? "text-[var(--accent-teal)]" : ""} />
                                            </div>
                                            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">{item.name}</span>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link href="/account" onClick={playTick} className={`flex items-center h-12 mx-2 rounded-lg transition-colors overflow-hidden whitespace-nowrap ${pathname === '/account' ? 'bg-[var(--bg-card)] text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
                                <div className="w-[64px] flex-shrink-0 flex items-center justify-center"><Settings size={20} /></div>
                                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">{terms.neuralProtocols}</span>
                            </Link>
                        </motion.div>
                        <SquishyButton 
                            onClick={async () => { playTick(); await supabase.auth.signOut(); useStudyStore.getState().reset(); window.location.href = "/login"; }} 
                            className="flex w-full items-center h-12 mx-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors overflow-hidden whitespace-nowrap" style={{ padding: 0 }}
                        >
                            <div className="w-[64px] flex-shrink-0 flex items-center justify-center"><LogOut size={20} /></div>
                            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">Logout</span>
                        </SquishyButton>
                    </div>
                </div>
            </nav>

            {/* --- MOBILE BOTTOM NAV --- */}
            <nav className="fixed bottom-0 left-0 w-full bg-(--bg-sidebar)/90 backdrop-blur-xl border-t border-(--border-color) flex md:hidden items-center justify-around h-20 pb-safe z-50" style={{ willChange: 'transform' }}>
                {navItems.slice(0, 4).map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link key={item.name} href={item.href} className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${isActive ? 'text-(--accent-teal)' : 'text-(--text-muted)'} relative`}>
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{item.name.split(' ')[0]}</span>
                            {isActive && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-(--accent-teal) rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                        </Link>
                    );
                })}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center w-full gap-1 transition-colors text-(--text-muted) relative"
                >
                    <MoreHorizontal size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">More</span>
                </button>
                <Link href="/account" className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${pathname === '/account' ? 'text-(--accent-teal)' : 'text-(--text-muted)'} relative`}>
                    <Settings size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Hearth</span>
                    {pathname === '/account' && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-(--accent-teal) rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                </Link>
            </nav>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] flex items-end md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        aria-label="Close menu"
                    />
                    <div className="relative w-full rounded-t-3xl border border-(--border-color) bg-(--bg-sidebar) p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-(--text-muted)">More</span>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-full bg-(--bg-dark) text-(--text-muted)"
                                aria-label="Close menu"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {navItems.slice(4).map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                                            isActive
                                                ? 'bg-(--accent-teal)/20 border-(--accent-teal)/40 text-(--accent-teal)'
                                                : 'bg-(--bg-dark) border-(--border-color) text-(--text-muted) hover:text-(--text-main)'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        <span className="truncate">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
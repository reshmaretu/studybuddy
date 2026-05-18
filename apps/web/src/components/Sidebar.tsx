"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { playTick } from "@/lib/sound";
import { useState, useEffect } from "react";
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
    const [isOnline, setIsOnline] = useState(true);
    const [isAPK, setIsAPK] = useState(false);

    const { terms, isGamified } = useTerms();

    // Detect APK environment and setup offline detection
    useEffect(() => {
        // Check if running in Capacitor (APK environment)
        const checkAPK = () => {
            return !!(window as any).capacitor || !!((window as any).Capacitor);
        };
        
        setIsAPK(checkAPK());
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
        { name: "Crystal Garden", href: "/garden", icon: Sprout },
        { name: "Lantern Network", href: "/lantern", icon: Radio, disabled: isAPK && !isOnline },
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
                                const isDisabled = item.disabled;
                                
                                const handleClick = (e: React.MouseEvent) => {
                                    if (isDisabled) {
                                        e.preventDefault();
                                        return;
                                    }
                                    if (isWardrobe) {
                                        handleWardrobeClick(e);
                                    }
                                    playTick();
                                };

                                return (
                                    <motion.div
                                        key={item.name}
                                        whileHover={isDisabled ? {} : { scale: 1.05, x: 4 }}
                                        whileTap={isDisabled ? {} : { scale: 0.9, rotate: -1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <Link 
                                            href={isDisabled || (isWardrobe && isCafe) ? "#" : item.href} 
                                            onClick={handleClick}
                                            className={`flex items-center h-12 mx-2 rounded-lg transition-all overflow-hidden whitespace-nowrap ${isActive && !isDisabled ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5"} ${(isWardrobe && isCafe) || isDisabled ? "cursor-not-allowed opacity-50" : ""} ${isWardrobe && shakeWardrobe ? "animate-premium-shake" : ""}`}
                                        >
                                            <div className="w-[64px] flex-shrink-0 flex items-center justify-center">
                                                <Icon size={20} className={isActive && !isDisabled ? "text-[var(--accent-teal)]" : ""} />
                                            </div>
                                            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">{item.name}</span>
                                            {isDisabled && <span className="ml-auto text-[8px] font-bold text-red-400 mr-2">Offline</span>}
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
            <nav className="fixed bottom-0 left-0 w-full bg-[var(--bg-sidebar)]/90 backdrop-blur-xl border-t border-[var(--border-color)] flex md:hidden items-center justify-around h-20 pb-safe z-50" style={{ willChange: 'transform' }}>
                {/* 1. Dashboard */}
                <Link href="/dashboard" className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${pathname === '/dashboard' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'} relative`}>
                    <LayoutGrid size={20} strokeWidth={pathname === '/dashboard' ? 2.5 : 2} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Dashboard</span>
                    {pathname === '/dashboard' && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-[var(--accent-teal)] rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                </Link>

                {/* 2. Garden */}
                <Link href="/garden" className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${pathname === '/garden' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'} relative`}>
                    <Sprout size={20} strokeWidth={pathname === '/garden' ? 2.5 : 2} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Garden</span>
                    {pathname === '/garden' && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-[var(--accent-teal)] rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                </Link>

                {/* 3. Middle Circle Button (More) */}
                <div className="flex flex-col items-center justify-center w-full relative">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="w-13 h-13 bg-[var(--accent-teal)] text-[#0b1211] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(20,184,166,0.4)] hover:scale-105 active:scale-95 transition-all -translate-y-2 border-4 border-[var(--bg-sidebar)] z-10"
                        aria-label="More tabs"
                    >
                        <MoreHorizontal size={24} />
                    </button>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">More</span>
                </div>

                {/* 4. Lantern Network */}
                <Link href="/lantern" className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${pathname === '/lantern' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'} relative`}>
                    <Radio size={20} strokeWidth={pathname === '/lantern' ? 2.5 : 2} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Lantern</span>
                    {pathname === '/lantern' && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-[var(--accent-teal)] rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                </Link>

                {/* 5. Wardrobe */}
                <Link href="/wardrobe" className={`flex flex-col items-center justify-center w-full gap-1 transition-colors ${pathname === '/wardrobe' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'} relative`}>
                    <Shirt size={20} strokeWidth={pathname === '/wardrobe' ? 2.5 : 2} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Wardrobe</span>
                    {pathname === '/wardrobe' && <motion.div layoutId="nav-indicator" className="absolute -top-[1px] w-8 h-[2px] bg-[var(--accent-teal)] rounded-full shadow-[0_0_10px_var(--accent-teal)]" />}
                </Link>
            </nav>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] flex items-end md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        aria-label="Close menu"
                    />
                    <div className="relative w-full rounded-t-3xl border border-[var(--border-color)] bg-[var(--bg-sidebar)] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">More</span>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-full bg-[var(--bg-dark)] text-[var(--text-muted)]"
                                aria-label="Close menu"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { name: "Flow Canvas", href: "/canvas", icon: Palette },
                                { name: terms.questForecast, href: "/calendar", icon: Calendar },
                                { name: "Archive", href: "/archive", icon: BookOpen },
                                { name: "Insights", href: "/insights", icon: BarChart3 },
                                { name: terms.neuralProtocols, href: "/account", icon: Settings },
                            ].map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                                            isActive
                                                ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)]/40 text-[var(--accent-teal)]'
                                                : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
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
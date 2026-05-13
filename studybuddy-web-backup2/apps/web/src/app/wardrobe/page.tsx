"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, Palette, Shirt, Sparkles, Gem } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { SquishyButton } from "@studybuddy/ui";

import ChumRenderer from "@/components/ChumRenderer";

import { useTerms } from "@/hooks/useTerms";

// --- THE ACCESSORY CATALOG ---
const ACCESSORY_CATALOG = {
    clips: [
        { id: 'clip1', name: 'Red Ribbon', fileName: 'clip1.png', previewFileName: '/assets/accessories/clip1.png', zIndex: 40, isPremium: false },
        { id: 'clip2', name: 'Rose', fileName: 'clip2.png', previewFileName: '/assets/accessories/clip2.png', zIndex: 40, isPremium: false },
        { id: 'clip3', name: 'Yellow Tulip', fileName: 'clip3.png', previewFileName: '/assets/accessories/clip3.png', zIndex: 40, isPremium: true },
        { id: 'clip4', name: 'Purple Rose', fileName: 'clip4.png', previewFileName: '/assets/accessories/clip4.png', zIndex: 40, isPremium: true },
        { id: 'clip5', name: 'Green Ribbon', fileName: 'clip5.png', previewFileName: '/assets/accessories/clip5.png', zIndex: 40, isPremium: true },
    ],
    glasses: [
        { id: 'glasses1', name: 'Brown Round Glasses', fileName: 'glasses1.png', previewFileName: '/assets/accessories/glasses1.png', zIndex: 30, isPremium: false },
        { id: 'glasses2', name: 'Gold Round Glasses', fileName: 'glasses2.png', previewFileName: '/assets/accessories/glasses2.png', zIndex: 30, isPremium: false },
        { id: 'glasses3', name: 'Silver Rectangle Glasses', fileName: 'glasses3.png', previewFileName: '/assets/accessories/glasses3.png', zIndex: 30, isPremium: false },
        { id: 'glasses4', name: 'Black Oversized Glasses', fileName: 'glasses4.png', previewFileName: '/assets/accessories/glasses4.png', zIndex: 30, isPremium: true },
        { id: 'glasses5', name: 'White Textured Square Glasses', fileName: 'glasses5.png', previewFileName: '/assets/accessories/glasses5.png', zIndex: 30, isPremium: true },
        { id: 'glasses6', name: 'Chum Glasses', fileName: 'glasses6.png', previewFileName: '/assets/accessories/glasses6.png', zIndex: 30, isPremium: true },
        { id: 'glasses7', name: 'White Square Glasses', fileName: 'glasses7.png', previewFileName: '/assets/accessories/glasses7.png', zIndex: 30, isPremium: true },
    ],
    hats: [
        { id: 'hat1', name: 'Beanie', fileName: 'hat1.png', previewFileName: '/assets/accessories/hat1.png', zIndex: 50, isPremium: false },
        { id: 'hat2', name: 'Hat', fileName: 'hat2.png', previewFileName: '/assets/accessories/hat2.png', zIndex: 50, isPremium: false },
        { id: 'hat3', name: 'Sports Band', fileName: 'hat3.png', previewFileName: '/assets/accessories/hat3.png', zIndex: 50, isPremium: false },
        { id: 'hat4', name: 'Ribbon', fileName: 'hat4.png', previewFileName: '/assets/accessories/hat4.png', zIndex: 50, isPremium: true },
        { id: 'hat5', name: 'Cap', fileName: 'hat5.png', previewFileName: '/assets/accessories/hat5.png', zIndex: 50, isPremium: true },
        { id: 'hat6', name: 'Crown', fileName: 'hat6.png', previewFileName: '/assets/accessories/hat6.png', zIndex: 50, isPremium: true },
    ],
};

// --- BASE COLORS CATALOG (UPDATED WITH 17 COLORS) ---
const BASE_COLORS_CATALOG = [
    { id: 'base1', name: 'Sakura Pink', fileName: 'base1.png', color: '#ffb7c5' },
    { id: 'base2', name: 'Dusty Rose', fileName: 'base2.png', color: '#dcae96' },
    { id: 'base3', name: 'Crimson', fileName: 'base3.png', color: '#dc143c' },
    { id: 'base4', name: 'Plum', fileName: 'base4.png', color: '#dda0dd' },
    { id: 'base5', name: 'Deep Violet', fileName: 'base5.png', color: '#9400d3' },
    { id: 'base6', name: 'Nightshade', fileName: 'base6.png', color: '#4b0082' },
    { id: 'base7', name: 'Aqua Glass (Default)', fileName: 'base7.png', color: '#7fffd4' },
    { id: 'base8', name: 'Ocean Blue', fileName: 'base8.png', color: '#0077be' },
    { id: 'base9', name: 'Forest Emerald', fileName: 'base9.png', color: '#008a3f' },
    { id: 'base10', name: 'Antique Gold', fileName: 'base10.png', color: '#cfb53b' },
    { id: 'base11', name: 'Sunstone', fileName: 'base11.png', color: '#e3a857' },
    { id: 'base12', name: 'Dreamscape', fileName: 'base12.png', color: '#a282b8' },
    { id: 'base13', name: 'Coral', fileName: 'base13.png', color: '#ff7f50' },
    { id: 'base14', name: 'Mint', fileName: 'base14.png', color: '#98ff98' },
    { id: 'base15', name: 'Sage', fileName: 'base15.png', color: '#9dc183' },
    { id: 'base16', name: 'Lunar Silver', fileName: 'base16.png', color: '#c0c0c0' },
    { id: 'base17', name: 'Bronze', fileName: 'base17.png', color: '#cd7f32' },
];

const CRYSTAL_CATALOG = {
    // 🟢 STARTER
    quartz: { name: "Clear Quartz", unlockLevel: 1, isPremium: false, color: "#e0f8ff", emissive: "#8cd8f5" },
    aquamarine: { name: "Aquamarine", unlockLevel: 1, isPremium: false, color: "#ecfeff", emissive: "#06b6d4" },

    // 🔵 PROGRESSION
    rose_quartz: { name: "Rose Quartz", unlockLevel: 3, isPremium: false, color: "#fdf2f8", emissive: "#f43f5e" },
    amethyst: { name: "Amethyst", unlockLevel: 5, isPremium: false, color: "#f3e8ff", emissive: "#c084fc" },
    citrine: { name: "Citrine", unlockLevel: 8, isPremium: false, color: "#fefce8", emissive: "#eab308" },
    emerald: { name: "Emerald", unlockLevel: 10, isPremium: false, color: "#ecfdf5", emissive: "#34d399" },
    sapphire: { name: "Deep Sapphire", unlockLevel: 15, isPremium: false, color: "#eff6ff", emissive: "#3b82f6" },
    morganite: { name: "Morganite", unlockLevel: 18, isPremium: false, color: "#fdf2f8", emissive: "#f472b6" },
    celestine: { name: "Celestine", unlockLevel: 20, isPremium: false, color: "#f0f9ff", emissive: "#7dd3fc" },
    jade: { name: "Meadow Jade", unlockLevel: 22, isPremium: false, color: "#f0fdf4", emissive: "#4ade80" },
    sunstone: { name: "Sunstone", unlockLevel: 28, isPremium: false, color: "#fff7ed", emissive: "#ea580c" },
    obsidian: { name: "Void Obsidian", unlockLevel: 30, isPremium: false, color: "#1f2937", emissive: "#6b21a8" },
    lapis: { name: "Lapis Lazuli", unlockLevel: 35, isPremium: false, color: "#1e3a8a", emissive: "#fbbf24" },
    carnelian: { name: "Carnelian", unlockLevel: 40, isPremium: false, color: "#fef2f2", emissive: "#dc2626" },
    malachite: { name: "Malachite", unlockLevel: 45, isPremium: false, color: "#064e3b", emissive: "#10b981" },

    // 🟡 PREMIUM
    ruby: { name: "Crimson Ruby", unlockLevel: 1, isPremium: true, color: "#fff1f2", emissive: "#fb7185" },
    topaz: { name: "Imperial Topaz", unlockLevel: 1, isPremium: true, color: "#fff7ed", emissive: "#f97316" },
    moonstone: { name: "Lunar Moonstone", unlockLevel: 1, isPremium: true, color: "#f8fafc", emissive: "#94a3b8" },
    opal: { name: "Iridescent Opal", unlockLevel: 1, isPremium: true, color: "#f8fafc", emissive: "#14b8a6" },
    onyx: { name: "Blood Onyx", unlockLevel: 1, isPremium: true, color: "#111827", emissive: "#dc2626" },
    fluorite: { name: "Neon Fluorite", unlockLevel: 1, isPremium: true, color: "#fdf4ff", emissive: "#d946ef" },
    bismuth: { name: "Bismuth", unlockLevel: 1, isPremium: true, color: "#312e81", emissive: "#ec4899" },
};

export default function WardrobePage() {
    // UI Tabs State
    const [activeTab, setActiveTab] = useState<'themes' | 'crystals' | 'accessories'>('themes');
    const [shakeTarget, setShakeTarget] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(true);

    // 🌐 GET THE TRANSLATOR
    const { isGamified } = useTerms();

    // Store State
    const {
        isPremiumUser, checkPremiumStatus, level,
        activeCrystalTheme, setActiveCrystalTheme,
        activeAtmosphereFilter, setActiveAtmosphereFilter,
        activeAccessories, setActiveAccessories,
        activeBaseColor, setActiveBaseColor,
        activeAppTheme, setActiveAppTheme
    } = useStudyStore();

    useEffect(() => {
        const initWardrobe = async () => {
            setIsSyncing(true);
            await checkPremiumStatus();
            setIsSyncing(false);
        };
        initWardrobe();
    }, [checkPremiumStatus]);

    const handleAppThemeChange = (themeId: string, isPremium: boolean) => {
        if (isPremium && !isPremiumUser) {
            setShakeTarget(themeId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        setActiveAppTheme(themeId);
    };

    const handleCrystalChange = (crystalId: string, crystal: any) => {
        if (crystal.isPremium && !isPremiumUser) {
            setShakeTarget(crystalId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        if (level < crystal.unlockLevel) {
            setShakeTarget(crystalId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        if (setActiveCrystalTheme) setActiveCrystalTheme(crystalId);
    };

    const handleToggleAccessory = (accessory: any) => {
        if (accessory.isPremium && !isPremiumUser) {
            setShakeTarget(accessory.id);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }

        const isActive = activeAccessories?.some(acc => acc.id === accessory.id);
        let newAccessories;

        if (isActive) {
            newAccessories = (activeAccessories || []).filter(acc => acc.id !== accessory.id);
        } else {
            const isHeadwear = accessory.zIndex === 40 || accessory.zIndex === 50;

            const filtered = (activeAccessories || []).filter(acc => {
                if (isHeadwear) {
                    return acc.zIndex !== 40 && acc.zIndex !== 50;
                } else {
                    return acc.zIndex !== accessory.zIndex;
                }
            });

            newAccessories = [...filtered, {
                id: accessory.id,
                fileName: accessory.fileName,
                zIndex: accessory.zIndex,
                name: accessory.name
            }];
        }

        setActiveAccessories(newAccessories);
    };

    const freeThemes = [
        { id: "deep-teal", name: "Deep Teal", color1: "#101918", color2: "#2dd4bf" },
        { id: "dark-forest", name: "Dark Forest", color1: "#1a1a1a", color2: "#8fc1b5" },
        { id: "light", name: "Light Mode", color1: "#f8fafc", color2: "#3b82f6" },
    ];

    const premiumThemes = [
        { id: "sakura", name: "Sakura Sanctuary", color1: "#2a2125", color2: "#ff8fb8" },
        { id: "academia", name: "Dark Academia", color1: "#1e1b18", color2: "#d4af37" },
        { id: "lofi", name: "Lofi Sunset", color1: "#171026", color2: "#f472b6" },
        { id: "nordic", name: "Nordic Frost", color1: "#e2e8f0", color2: "#0284c7" },
        { id: "e-ink", name: "E-Ink (Obsidian)", color1: "#000000", color2: "#ffffff" },
    ];

    const starterCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => !c.isPremium && c.unlockLevel === 1);
    const progressionCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => !c.isPremium && c.unlockLevel > 1).sort((a, b) => a[1].unlockLevel - b[1].unlockLevel);
    const premiumCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => c.isPremium);

    return (
        <div className="flex flex-col h-full p-6 lg:p-8 bg-[var(--bg-dark)] overflow-hidden">
            <header className="mb-6 shrink-0">
                <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                    <Shirt className="text-[var(--accent-teal)]" size={32} /> The Wardrobe
                </h1>
                <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest mt-2">
                    Personalize your presence & sanctuary
                </p>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

                {/* LEFT PANEL: Character Preview & Base Colors */}
                <section id="wardrobe-avatar-preview" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col relative overflow-hidden shadow-sm">
                    <div className="absolute top-6 left-6 z-10">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Character Preview</span>
                    </div>

                    {/* AVATAR RENDERER */}
                    <div className="flex-1 flex items-center justify-center w-full min-h-0 mt-8">
                        <div className="relative w-64 h-64 shrink-0">
                            <ChumRenderer size="w-full h-full" />
                        </div>
                    </div>

                    {/* 🔥 CHUM BASE COLOR SCROLL CONTAINER 🔥 */}
                    <div className="w-full mt-auto pt-6 border-t border-[var(--border-color)]/50 shrink-0">
                        <div className="flex justify-between items-center px-4 mb-4">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                {isGamified ? "Chum Base Color" : "Chum Base Color"}
                            </label>
                            <SquishyButton
                                onClick={() => setActiveBaseColor('base7')}
                                className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest bg-black/20 px-2 py-1 rounded transition-colors"
                            >
                                Reset to Default
                            </SquishyButton>
                        </div>

                        <div className="flex items-center justify-start sm:justify-center gap-4 overflow-x-auto w-full py-6 px-4 custom-scrollbar no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
                            {BASE_COLORS_CATALOG.map((base) => (
                                <SquishyButton
                                    key={base.id}
                                    onClick={() => setActiveBaseColor(base.id)}
                                    className={`relative shrink-0 w-16 h-16 rounded-full overflow-hidden border-[3px] transition-all duration-300 flex items-center justify-center ${activeBaseColor === base.id
                                        ? 'border-[var(--accent-teal)] scale-110 shadow-[0_0_20px_rgba(20,184,166,0.4)] z-10 bg-[var(--bg-dark)]'
                                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 bg-[var(--bg-sidebar)]/50'
                                        }`}
                                    title={base.name}
                                    style={{ scrollSnapAlign: 'center' }}
                                    disabled={false}
                                >
                                    {/* 🔥 STRICTLY THE IMAGE PREVIEW 🔥 */}
                                    <img
                                        src={`/assets/chum/${base.fileName}`}
                                        alt={base.name}
                                        className="w-[140%] h-[140%] object-cover object-center translate-y-1 drop-shadow-md"
                                    />
                                </SquishyButton>
                            ))}
                        </div>
                    </div>
                </section>

                {/* RIGHT PANEL: Customization Hub */}
                <section id="wardrobe-customization-hub" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl flex flex-col min-h-0 shadow-sm overflow-hidden">

                    {/* TABS HEADER */}
                    <div className="flex p-2 border-b border-[var(--border-color)]/50 bg-[var(--bg-dark)]/30">
                        <SquishyButton
                            onClick={() => setActiveTab('themes')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'themes' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] border border-transparent'}`}
                        >
                            <Palette size={14} className={activeTab === 'themes' ? 'text-[var(--accent-cyan)]' : ''} /> App Themes
                        </SquishyButton>
                        <SquishyButton
                            onClick={() => setActiveTab('crystals')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'crystals' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] border border-transparent'}`}
                        >
                            <Gem size={14} className={activeTab === 'crystals' ? 'text-[var(--accent-teal)]' : ''} /> Crystal Vault
                        </SquishyButton>
                        <SquishyButton
                            onClick={() => setActiveTab('accessories')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'accessories' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] border border-transparent'}`}
                        >
                            <Shirt size={14} className={activeTab === 'accessories' ? 'text-[var(--accent-teal)]' : ''} /> {isGamified ? "Charms" : "Accessories"}
                        </SquishyButton>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar no-scrollbar relative">
                        <AnimatePresence mode="wait">

                            {/* APP THEMES TAB */}
                            {activeTab === 'themes' && (
                                <motion.div key="themes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Standard Aesthetics</label>
                                            <SquishyButton onClick={() => handleAppThemeChange('deep-teal', false)} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest px-2 py-1 bg-black/20 rounded transition-colors">Reset to Default</SquishyButton>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {freeThemes.map((theme) => (
                                                <ThemeButton key={theme.id} theme={theme} isActive={activeAppTheme === theme.id} onClick={() => handleAppThemeChange(theme.id, false)} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Premium Collection</label>
                                            {!isPremiumUser && !isSyncing && <Sparkles size={12} className="text-[var(--accent-yellow)]" />}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {premiumThemes.map((theme) => (
                                                <ThemeButton key={theme.id} theme={theme} isActive={activeAppTheme === theme.id} isLocked={!isPremiumUser} isShaking={shakeTarget === theme.id} onClick={() => handleAppThemeChange(theme.id, true)} />
                                            ))}
                                        </div>
                                    </div>
                                    {/* GARDEN ATMOSPHERE FILTERS */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Garden Atmosphere</label>
                                            <SquishyButton onClick={() => setActiveAtmosphereFilter('default')} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest px-2 py-1 bg-black/20 rounded transition-colors">Reset to Default</SquishyButton>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { id: 'default', name: 'Dawn Mist' },
                                                { id: 'dark', name: 'Midnight Void' },
                                                { id: 'refreshing', name: 'Mint Breeze' },
                                                { id: 'cool', name: 'Glacial Chill' }
                                            ].map((filter) => (
                                                <SquishyButton
                                                    key={filter.id}
                                                    onClick={() => setActiveAtmosphereFilter(filter.id as any)}
                                                    className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeAtmosphereFilter === filter.id ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] text-[var(--accent-teal)] shadow-[0_0_10px_rgba(20,184,166,0.15)]' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]'}`}
                                                >
                                                    {filter.name}
                                                </SquishyButton>
                                            ))}
                                        </div>
                                    </div>
                                    <hr className="border-[var(--border-color)]/30" />
                                </motion.div>
                            )}

                            {/* CRYSTAL VAULT TAB */}
                            {activeTab === 'crystals' && (
                                <motion.div key="crystals" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">

                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Starter Seeds</label>
                                            <SquishyButton onClick={() => handleCrystalChange('quartz', CRYSTAL_CATALOG['quartz'])} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest px-2 py-1 bg-black/20 rounded transition-colors">Reset to Default</SquishyButton>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {starterCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block flex items-center gap-2">Ascension Unlocks <span className="bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] px-2 py-0.5 rounded-full text-[8px]">LVL {level}</span></label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {progressionCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} isLocked={level < crystal.unlockLevel} isShaking={shakeTarget === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Pro Collection</label>
                                            {!isPremiumUser && !isSyncing && <Sparkles size={12} className="text-[var(--accent-yellow)]" />}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {premiumCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} isLocked={!isPremiumUser} isShaking={shakeTarget === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                </motion.div>
                            )}

                            {/* ACCESSORIES TAB (NEW) */}
                            {activeTab === 'accessories' && (
                                <motion.div key="accessories" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">

                                    <div className="flex justify-end mb-2">
                                        <SquishyButton onClick={() => setActiveAccessories([])} className="text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest px-3 py-1.5 bg-black/20 rounded transition-colors">Unequip All Charms</SquishyButton>
                                    </div>
                                    {/* CLIPS SECTION */}
                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Hair Clips</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {ACCESSORY_CATALOG.clips.map((clip) => (
                                                <AccessoryButton
                                                    key={clip.id}
                                                    accessory={clip}
                                                    isActive={activeAccessories?.some(acc => acc.id === clip.id) || false}
                                                    isLocked={clip.isPremium && !isPremiumUser}
                                                    isShaking={shakeTarget === clip.id}
                                                    onClick={() => handleToggleAccessory(clip)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* GLASSES SECTION */}
                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Eyewear</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {ACCESSORY_CATALOG.glasses.map((glasses) => (
                                                <AccessoryButton
                                                    key={glasses.id}
                                                    accessory={glasses}
                                                    isActive={activeAccessories?.some(acc => acc.id === glasses.id) || false}
                                                    isLocked={glasses.isPremium && !isPremiumUser}
                                                    isShaking={shakeTarget === glasses.id}
                                                    onClick={() => handleToggleAccessory(glasses)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* HATS SECTION */}
                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Headwear</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {ACCESSORY_CATALOG.hats.map((hat) => (
                                                <AccessoryButton
                                                    key={hat.id}
                                                    accessory={hat}
                                                    isActive={activeAccessories?.some(acc => acc.id === hat.id) || false}
                                                    isLocked={hat.isPremium && !isPremiumUser}
                                                    isShaking={shakeTarget === hat.id}
                                                    onClick={() => handleToggleAccessory(hat)}
                                                />
                                            ))}
                                        </div>
                                    </div>


                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </div>
        </div>
    );
}

// 🎨 Helper Component for App Themes
function ThemeButton({ theme, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <SquishyButton onClick={onClick} className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' : isActive ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] shadow-lg' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 hover:bg-[var(--bg-sidebar)]'} ${isLocked && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}>
            <div className="w-8 h-8 rounded-full mr-3 border border-[var(--border-color)] shadow-sm shrink-0" style={{ background: `linear-gradient(135deg, ${theme.color1} 50%, ${theme.color2} 50%)` }} />
            <span className="font-bold text-xs text-[var(--text-main)] flex-1 text-left">{theme.name}</span>
            {isActive ? <CheckCircle2 className="text-[var(--accent-teal)] w-4 h-4 shrink-0" /> : isLocked && <Lock size={12} className="text-[var(--text-muted)] shrink-0" />}
        </SquishyButton>
    );
}

// 💎 Helper Component for Crystals
function CrystalButton({ crystal, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <SquishyButton onClick={onClick} className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' : isActive ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 hover:bg-[var(--bg-sidebar)]'} ${isLocked && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}>
            {/* Glowing Gem Preview */}
            <div className="w-8 h-8 rounded-lg mr-3 shadow-inner shrink-0 relative overflow-hidden" style={{ backgroundColor: crystal.color, border: `1px solid ${crystal.emissive}50` }}>
                <div className="absolute inset-0 opacity-50 blur-md" style={{ backgroundColor: crystal.emissive }}></div>
                {/* Facet illusion */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 skew-y-12 translate-y-[-50%]"></div>
            </div>

            <div className="flex-1 text-left flex flex-col">
                <span className="font-bold text-xs text-[var(--text-main)]">{crystal.name}</span>
                {isLocked && !crystal.isPremium && (
                    <span className="text-[9px] text-[var(--text-muted)] font-black tracking-widest uppercase">Unlocks Lvl {crystal.unlockLevel}</span>
                )}
                {isLocked && crystal.isPremium && (
                    <span className="text-[9px] text-[var(--accent-yellow)] font-black tracking-widest uppercase">Pro Exclusive</span>
                )}
            </div>

            {isActive ? <CheckCircle2 className="text-[var(--accent-teal)] w-4 h-4 shrink-0" /> : isLocked && <Lock size={12} className="text-[var(--text-muted)] shrink-0" />}
        </SquishyButton>
    );
}

// 👕 Helper Component for Accessories
function AccessoryButton({ accessory, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <SquishyButton
            onClick={onClick}
            className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' :
                isActive ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] shadow-[0_0_15px_rgba(20,184,166,0.15)]' :
                    'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 hover:bg-[var(--bg-sidebar)]'
                } ${isLocked && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}
        >
            <div className="w-8 h-8 rounded-lg mr-3 shadow-sm shrink-0 relative overflow-hidden bg-[var(--bg-dark)]/50 border border-[var(--border-color)] flex items-center justify-center p-0.5">
                <img
                    src={accessory.previewFileName
                        ? (accessory.previewFileName.startsWith('/') ? accessory.previewFileName : `/assets/chum/${accessory.previewFileName}`)
                        : (accessory.fileName.startsWith('/') ? accessory.fileName : `/assets/chum/${accessory.fileName}`)}
                    alt={accessory.name}
                    className="w-full h-full object-contain drop-shadow-md"
                />
            </div>

            <div className="flex-1 text-left flex flex-col">
                <span className="font-bold text-xs text-white">{accessory.name}</span>
                {isLocked && (
                    <span className="text-[9px] text-[var(--accent-yellow)] font-black tracking-widest uppercase">Pro Exclusive</span>
                )}
            </div>

            {isActive ? <CheckCircle2 className="text-[var(--accent-teal)] w-4 h-4 shrink-0" /> : isLocked && <Lock size={12} className="text-white/40 shrink-0" />}
        </SquishyButton>
    );
}
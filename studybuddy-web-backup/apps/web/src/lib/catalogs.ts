export const ACCESSORY_CATALOG = {
    ribbons: [
        { id: 'red_ribbon', name: 'Satin Bow', fileName: 'ribbon_red.png', zIndex: 40, isPremium: false },
        { id: 'green_ribbon', name: 'Forest Bow', fileName: 'ribbon_green.png', zIndex: 40, isPremium: false },
    ],
    headwear: [
        { id: 'white_headset', name: 'Pro Studio', fileName: 'headset_white.png', zIndex: 50, isPremium: true },
    ],
    face: [
        { id: 'white_glasses', name: 'Smart Frames', fileName: 'glasses_white.png', zIndex: 30, isPremium: true },
    ],
};

export const CRYSTAL_CATALOG = {
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

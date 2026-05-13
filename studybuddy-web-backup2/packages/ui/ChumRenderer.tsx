"use client";

import { useStudyStore } from "@studybuddy/api";
import { motion, AnimatePresence } from "framer-motion";

interface ChumRendererProps {
    size?: string;
    activeAccessoriesOverride?: any[];
    baseColorIdOverride?: string | null;
}

export const ChumRenderer = ({ size = "w-64 h-64", activeAccessoriesOverride, baseColorIdOverride }: ChumRendererProps) => {
    const storeAccessories = useStudyStore((state) => state.activeAccessories);
    const storeBaseColor = useStudyStore((state) => state.activeBaseColor);
    const accessories = activeAccessoriesOverride !== undefined ? (activeAccessoriesOverride || []) : storeAccessories;
    const baseColorId = baseColorIdOverride !== undefined ? (baseColorIdOverride || 'base7') : storeBaseColor;
    const sortedAccessories = [...(accessories || [])].sort((a, b) => a.zIndex - b.zIndex);

    return (
        <div className={`relative ${size} flex items-center justify-center`}>
            {/* 1. THE BASE BODY */}
            <img
                src={`/assets/chum/${baseColorId || 'base7'}.png`}
                alt="Chum Body"
                className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* 2. THE ACCESSORIES */}
            <AnimatePresence>
                {sortedAccessories.map((acc) => (
                    <motion.img
                        key={acc.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        src={`/assets/chum/${acc.fileName}`}
                        alt={acc.name || acc.id}
                        style={{ zIndex: acc.zIndex }}
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                ))}
            </AnimatePresence>

            {/* 3. SHADOW/GLOW underneath */}
            <div className="absolute bottom-4 w-1/2 h-4 bg-black/10 blur-xl rounded-full -z-10" />
        </div>
    );
};

"use client";
import React, { useState, useRef, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera, QuadraticBezierLine, QuadraticBezierLineRef, Float, Points, PointMaterial, Line } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, BoxSelect, Layers, Zap, Maximize2, Minimize2, Settings } from "lucide-react";
import { useStudyStore, LanternUser, Pact } from "@/store/useStudyStore";
import { useRouter } from "next/navigation";
import ChumRenderer from "./ChumRenderer";
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// --- CONFIG & UTILS ---

// Generate a stable random color based on user ID (one-time per user)
const generateUserColor = (userId: string): string => {
    // Special case: "You" user keeps pink color
    if (userId === 'me') return '#ff1493';
    
    // Generate a stable hash from user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use hash to generate HSL color (saturated, bright)
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash % 30)); // 70-100% saturation
    const lightness = 50 + (Math.abs(hash % 20)); // 50-70% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Generate a stable pact color from pact ID
const getPactColor = (pactId: string): string => {
    let hash = 0;
    for (let i = 0; i < pactId.length; i++) {
        const char = pactId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    // Convert hash to a deterministic hex color
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "000000".substring(0, 6 - c.length) + c;
};

const STATUS_CONFIG: Record<LanternUser['status'], { color: string; emissive: number; scale: number; pulse: number }> = {
    offline: { color: '#555522', emissive: 0.5, scale: 0.4, pulse: 0 },
    idle: { color: '#ffcc00', emissive: 5.0, scale: 0.6, pulse: 1 },
    drafting: { color: '#ffd000', emissive: 6.0, scale: 0.6, pulse: 2 },
    hosting: { color: '#ffff00', emissive: 18.0, scale: 0.9, pulse: 4 },
    joined: { color: '#ffff33', emissive: 10.0, scale: 0.8, pulse: 3 },
    // 👇 DASHBOARD MODES
    flowState: { color: '#00ffff', emissive: 25.0, scale: 0.8, pulse: 6 },
    cafe: { color: '#ff8800', emissive: 12.0, scale: 0.7, pulse: 1.5 },
    mastering: { color: '#c084fc', emissive: 35.0, scale: 1.2, pulse: 14 } // 💎 Hyper-Pulse Shard
};

const CONSTELLATION_TEMPLATES = [
    {
        name: "Triangulum",
        points: [[-4, -4, 0], [4, -4, 0], [0, 6, 0]] as [number, number, number][],
        lines: [[0, 1], [1, 2], [2, 0]]
    },
    {
        name: "Crux",
        points: [[0, 7, 0], [0, -7, 0], [-4, 1, 0], [4, 1, 0]] as [number, number, number][],
        lines: [[0, 1], [2, 3]]
    },
    {
        name: "Cassiopeia",
        points: [[-10, 5, 0], [-5, -2, 0], [0, 3, 0], [5, -2, 0], [10, 5, 0]] as [number, number, number][],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    {
        name: "Cygnus",
        points: [[0, 10, 0], [0, 2, 0], [0, -3, 0], [0, -9, 0], [-7, 2, 0], [7, 2, 0]] as [number, number, number][],
        lines: [[0, 1], [1, 2], [2, 3], [1, 4], [1, 5]]
    },
    {
        name: "Ursa Minor",
        points: [[-9, 7, 0], [-5, 6, 0], [-2, 4, 0], [0, 0, 0], [7, 1, 0], [6, -5, 0], [0, -6, 0]] as [number, number, number][],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
    },
    {
        name: "Orion",
        points: [[-5, 9, 0], [5, 8, 0], [0, 3, 0], [-1.5, 0, 0], [1.5, -1, 0], [-5, -7, 0], [5, -8, 0], [-8, 7, 0]] as [number, number, number][],
        lines: [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [0, 7]]
    },
    {
        name: "Lynx",
        points: [[-10, 10, 0], [-5, 5, 0], [0, 8, 0], [5, 3, 0], [10, 5, 0], [8, -3, 0], [3, -5, 0], [-3, -3, 0], [-8, -8, 0]] as [number, number, number][],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]
    }
];
const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

// --- COMPONENTS ---

export interface LanternNetHandle {
    warpToUser: (userId: string) => void;
}

const ThreeLanternNet = forwardRef<LanternNetHandle, {
    users: LanternUser[],
    isInitialLoading?: boolean,
    isMaximized: boolean,
    onToggleMaximize: () => void,
    debrisSize?: number,
    debrisColor?: string,
    debrisCount?: number,
    debrisSpread?: number,
    pacts?: Pact[],
    currentUserId?: string | null
}>(function ThreeLanternNet({ users, isInitialLoading, isMaximized, onToggleMaximize, debrisSize = 0.4, debrisColor = "#2dd4bf", debrisCount = 3000, debrisSpread = 400, pacts = [], currentUserId }, ref) {
    const [is3D, setIs3D] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [warpTarget, setWarpTarget] = useState<THREE.Vector3 | null>(null);
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { performanceSettings = { mode: 'auto', showParticles: true, bloomEnabled: true, antialiasing: true } } = useStudyStore();

    const isPerformanceLow = performanceSettings.mode === 'low' || (performanceSettings.mode === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768);
    const resolvedDebrisCount = isPerformanceLow ? 500 : performanceSettings.mode === 'balanced' ? 1500 : debrisCount;

    const [globalIntensity, setGlobalIntensity] = useState(0);
    const [isFocused, setIsFocused] = useState(false);

    const [isFreeCam, setIsFreeCam] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 2. THE POWER UP LOGIC
    useEffect(() => {
        let current = 0;
        const target = 1.8; // The "Sweet Spot" for brightness
        const interval = setInterval(() => {
            if (current >= target) {
                clearInterval(interval);
                return;
            }
            current += 0.04; // Speed of the power-up
            setGlobalIntensity(current);
        }, 30); // Runs every 30ms

        return () => clearInterval(interval);
    }, []);

    const getUserKey = useCallback((user: LanternUser) => {
        if (user.id === 'me' && currentUserId) return currentUserId;
        return user.id;
    }, [currentUserId]);

    const getBasePos = useCallback((user: LanternUser): [number, number, number] => {
        const zPos = is3D ? (user.gridZ - 6) * 12 + (user.jitterZ / 8) : 0;
        return [(user.gridX - 6) * 12 + (user.jitterX / 8), (user.gridY - 6) * 12 + (user.jitterY / 8), zPos];
    }, [is3D]);

    const { positions, pactLines, pactNameByUser } = useMemo(() => {
        const basePositions = new Map<string, [number, number, number]>();
        users.forEach((user) => {
            basePositions.set(getUserKey(user), getBasePos(user));
        });

        const nextPositions = new Map(basePositions);
        const lines: PactLine[] = [];
        const pactNames = new Map<string, string>();
        const pactMemberIds = new Set<string>();
        const pactCenters: Array<{ center: [number, number, number]; color: string }> = [];

        const getHash = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        };

        const getAngle = (seed: string) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
            }
            return (Math.abs(hash) % 360) * (Math.PI / 180);
        };

        pacts.forEach((pact) => {
            // NEW RPC STRUCTURE: pact_members is JSONB array with user_id field
            let memberIds = Array.from(new Set((pact.pact_members || []).map((m: any) => m.user_id).filter(Boolean)));
            
            // Ensure current user is included in pact members for rendering
            if (currentUserId && !memberIds.includes(currentUserId)) {
                memberIds.push(currentUserId);
            }
            
            // 🔥 CRITICAL: Sort member IDs so the constellation is deterministic for ALL users!
            memberIds.sort();

            memberIds.forEach((memberId: string) => {
                const normalizedId = currentUserId && memberId === currentUserId ? 'me' : memberId;
                // Use pact_name from RPC if available
                if (!pactNames.has(normalizedId)) pactNames.set(normalizedId, pact.pact_name || 'Pact');
                pactMemberIds.add(memberId);
            });

            const memberPositions = memberIds.map((id) => {
                return { id, pos: basePositions.get(id) };
            }).filter(m => m.pos) as { id: string; pos: [number, number, number] }[];

            if (memberPositions.length < 2) return;

            const center = memberPositions.reduce((acc, curr) => {
                acc[0] += curr.pos[0];
                acc[1] += curr.pos[1];
                acc[2] += curr.pos[2];
                return acc;
            }, [0, 0, 0] as [number, number, number]);
            center[0] /= memberPositions.length;
            center[1] /= memberPositions.length;
            center[2] /= memberPositions.length;

            // Select constellation template that BEST fits the current member count
            // This ensures a 3-member pact actually looks like Triangulum (a triangle)
            const exactTemplates = CONSTELLATION_TEMPLATES.filter(t => t.points.length === memberPositions.length);
            const largerTemplates = CONSTELLATION_TEMPLATES.filter(t => t.points.length > memberPositions.length)
                .sort((a, b) => a.points.length - b.points.length);
            
            let template;
            if (exactTemplates.length > 0) {
                template = exactTemplates[getHash(pact.id || 'default') % exactTemplates.length];
            } else if (largerTemplates.length > 0) {
                // If no exact match, pick from the closest larger templates for variety
                template = largerTemplates[getHash(pact.id || 'default') % Math.min(2, largerTemplates.length)];
            } else {
                template = CONSTELLATION_TEMPLATES[CONSTELLATION_TEMPLATES.length - 1];
            }

            // Scale template points based on a desired overall size
            const scale = 1.3; // Increased slightly for better clarity
            const rotation = getAngle(`${pact.id}-rotation`);
            const cosR = Math.cos(rotation);
            const sinR = Math.sin(rotation);

            memberPositions.forEach((member, i) => {
                let [tx, ty, tz] = i < template.points.length 
                    ? template.points[i] 
                    : [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 5];
                
                const rx = (tx * cosR - ty * sinR) * scale;
                const ry = (tx * sinR + ty * cosR) * scale;
                const rz = tz * scale;

                const targetX = center[0] + rx;
                const targetY = center[1] + ry;
                const targetZ = is3D ? center[2] + rz : 0;

                const base = member.pos;
                const blend = 0.7;
                const x = base[0] + (targetX - base[0]) * blend;
                const y = base[1] + (targetY - base[1]) * blend;
                const z = is3D ? base[2] + (targetZ - base[2]) * blend : 0;
                nextPositions.set(member.id, [x, y, z]);
            });

            const pactColor = pact.constellation_color || getPactColor(pact.id || 'default');

            pactCenters.push({
                center: [center[0], center[1], center[2]],
                color: pactColor
            });

            // Draw template lines
            const connectedSet = new Set<number>();
            template.lines.forEach(([startIdx, endIdx]) => {
                if (startIdx < memberPositions.length && endIdx < memberPositions.length) {
                    const start = nextPositions.get(memberPositions[startIdx].id);
                    const end = nextPositions.get(memberPositions[endIdx].id);
                    if (start && end) {
                        lines.push({ start, end, color: pactColor });
                        connectedSet.add(startIdx);
                        connectedSet.add(endIdx);
                    }
                }
            });

            // Ensure every node is connected to at least one other node to avoid "floating" stars
            for (let i = 0; i < memberPositions.length; i++) {
                if (!connectedSet.has(i) && i > 0) {
                    const start = nextPositions.get(memberPositions[i].id);
                    const end = nextPositions.get(memberPositions[i - 1].id);
                    if (start && end) {
                        lines.push({ start, end, color: pactColor });
                    }
                }
            }
        });

        if (pactCenters.length > 0) {
            const repelRadius = 40;
            const repelStrength = 32;
            basePositions.forEach((pos, userId) => {
                if (pactMemberIds.has(userId)) return;

                let closestCenter: [number, number, number] | null = null;
                let closestDist = Number.POSITIVE_INFINITY;
                for (const pact of pactCenters) {
                    const dx = pos[0] - pact.center[0];
                    const dy = pos[1] - pact.center[1];
                    const dist = Math.hypot(dx, dy);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestCenter = pact.center;
                    }
                }

                if (!closestCenter || closestDist >= repelRadius) return;

                const dx = pos[0] - closestCenter[0];
                const dy = pos[1] - closestCenter[1];
                const norm = Math.max(0.001, Math.hypot(dx, dy));
                const push = ((repelRadius - closestDist) / repelRadius) * repelStrength;
                const x = pos[0] + (dx / norm) * push;
                const y = pos[1] + (dy / norm) * push;
                const z = is3D ? pos[2] : 0;
                nextPositions.set(userId, [x, y, z]);
            });
        }

        return { positions: nextPositions, pactLines: lines, pactNameByUser: pactNames };
    }, [users, pacts, getUserKey, getBasePos, is3D, currentUserId]);

    const getPos = useCallback((user: LanternUser): [number, number, number] => {
        const key = getUserKey(user);
        return positions.get(key) || getBasePos(user);
    }, [getUserKey, positions, getBasePos]);

    useImperativeHandle(ref, () => ({
        warpToUser: (userId: string) => {
            const user = users.find(u => u.id === userId);
            if (user) {
                const pos = getPos(user);
                setWarpTarget(new THREE.Vector3(pos[0], pos[1], pos[2]));
            }
        }
    }), [users, getPos]);

    return (
        <div
            id="lantern-map-anchor"
            className="w-full h-full bg-black relative group"
            onPointerEnter={() => setIsFocused(true)}
            onPointerLeave={() => setIsFocused(false)}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
            {/* --- FREECAM HUD (Now safely anchored to the screen!) --- */}
            <AnimatePresence>
                {isFreeCam && is3D && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute bottom-6 left-6 z-[100] bg-[var(--bg-card)]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[var(--accent-teal)]/50 shadow-[0_0_15px_rgba(45,212,191,0.2)] pointer-events-none">
                        <p className="text-[10px] font-black uppercase text-[var(--accent-teal)] tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] animate-pulse" /> Freecam Active
                        </p>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] tracking-wide mt-1">WASD to Move • EQ for Elevation • Mouse to Look</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOOLBAR --- */}
            <div className="absolute top-6 right-6 z-[100] flex flex-col gap-3 items-end">
                <div className="flex items-center gap-1 bg-[var(--bg-card)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-color)] shadow-2xl">
                    {/* Maximize/Minimize Icon Button */}
                    <button onClick={onToggleMaximize} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all flex items-center justify-center" title={isMaximized ? "Minimize Map" : "Maximize Map"}>
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

                    {/* Settings Icon Button */}
                    <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className={`p-2 rounded-xl transition-all flex items-center justify-center ${showSettingsMenu ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`} title="Settings">
                        <Settings size={16} />
                    </button>
                </div>

                {/* --- SETTINGS FLOATING MENU --- */}
                <AnimatePresence>
                    {showSettingsMenu && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4 bg-[var(--bg-card)]/90 backdrop-blur-xl p-4 rounded-2xl border border-[var(--border-color)] shadow-2xl min-w-[200px]">
                            {/* View Type Toggle */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">View Type</span>
                                <div className="flex bg-[var(--bg-dark)] p-1 rounded-xl border border-[var(--border-color)] gap-1">
                                    <button onClick={() => { setIs3D(false); setIsFreeCam(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${!is3D ? 'bg-[var(--accent-teal)] text-[#0b1211] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                        <BoxSelect size={12} /> 2D Map
                                    </button>
                                    <button onClick={() => setIs3D(true)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${is3D ? 'bg-[var(--accent-teal)] text-[#0b1211] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                        <Layers size={12} /> 3D Void
                                    </button>
                                </div>
                            </div>

                            {/* Freecam Toggle (Only in 3D) */}
                            {is3D && (
                                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Freecam Mode</span>
                                    <button onClick={() => setIsFreeCam(!isFreeCam)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isFreeCam ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'bg-[var(--bg-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'}`}>
                                        {isFreeCam ? 'Active' : 'Off'}
                                    </button>
                                </div>
                            )}

                            {/* Brightness Slider */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Brightness</span>
                                <div className="flex items-center gap-2 bg-[var(--bg-dark)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                                    <Zap size={12} className="text-[var(--accent-yellow)] shrink-0" />
                                    <input
                                        type="range" min="0.5" max="4.0" step="0.1"
                                        value={globalIntensity}
                                        onChange={(e) => setGlobalIntensity(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-teal)]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- HUD LOADER --- */}
                {isInitialLoading && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[var(--bg-card)]/60 backdrop-blur-md px-6 py-3 rounded-full border border-[var(--border-color)] animate-pulse shadow-xl">
                        <div className="w-3 h-3 border-2 border-[var(--accent-teal)]/30 border-t-[var(--accent-teal)] rounded-full animate-spin" />
                        <span className="text-[10px] font-black tracking-widest uppercase text-[var(--accent-teal)]">Syncing Void...</span>
                    </div>
                )}
            </div>

            <Canvas
                dpr={[1, 2]}
                gl={{ 
                    powerPreference: "high-performance",
                    antialias: !isPerformanceLow,
                    stencil: false,
                    depth: true
                }}
            >
                <PerspectiveCamera makeDefault position={[0, 0, 120]} fov={30} />
                {performanceSettings.showParticles && (
                    <FloatingParticles size={debrisSize} color={debrisColor} count={resolvedDebrisCount} spread={debrisSpread} />
                )}
                <GlobalPulse />
                {/* 👇 INCREASE AMBIENT LIGHT to 0.8 to illuminate the dust and mesh shells */}
                <ambientLight intensity={1.5} />

                {/* 👇 ADD A CENTRAL POINT LIGHT that fills the entire "Void" */}
                <pointLight position={[0, 0, 0]} intensity={2.5} color="#2dd4bf" distance={200} decay={1} />

                {/* 👇 ADD A TOP-DOWN LIGHT for better 3D depth */}
                <directionalLight position={[0, 0, 50]} intensity={2} color="#ffffff" />

                <GlobalPulse key={users.length} />
                <ShootingStars is3D={is3D} />

                <LanternConstellation users={users} currentUserId={currentUserId} is3D={is3D} onWarp={setWarpTarget} intensity={globalIntensity} positions={positions} pactLines={pactLines} pactNameByUser={pactNameByUser} getPos={getPos} selectedId={selectedId} setSelectedId={setSelectedId} />

                <EffectComposer enabled={performanceSettings.bloomEnabled && !isPerformanceLow} enableNormalPass={false}>
                    <Bloom
                        luminanceThreshold={1}
                        mipmapBlur
                        intensity={1.5}
                        radius={0.4}
                    />
                </EffectComposer>

                <CameraRig isFocused={isFocused} is3D={is3D} controlsRef={controlsRef} warpTarget={warpTarget} intensity={globalIntensity} onWarpComplete={() => setWarpTarget(null)} isFreeCam={isFreeCam} setIsFreeCam={setIsFreeCam} />
                <OrbitControls
                    ref={controlsRef}
                    enablePan={true} // 👈 Enabled everywhere to allow panning in 2D
                    enableZoom={true}
                    enableDamping={true}
                    dampingFactor={0.1} // 👈 Snappier feel
                    makeDefault
                    mouseButtons={{
                        LEFT: is3D ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.PAN
                    }}
                    touches={{
                        ONE: is3D ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN,
                        TWO: THREE.TOUCH.DOLLY_PAN
                    }}
                    enableRotate={is3D}
                />
            </Canvas>
        </div>
    );
});


function ShootingStars({ is3D }: { is3D: boolean }) {
    const lines = useRef<THREE.Line[]>([]);
    const scene = useThree((state) => state.scene);

    useEffect(() => {
        const materials = [
            new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.8 }),
            new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8 }),
            new THREE.LineBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.8 }),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        ];
        
        for (let i = 0; i < 8; i++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -40)]);
            const material = materials[i % materials.length];
            const line = new THREE.Line(geometry, material);
            
            // Random start
            line.position.set((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800, is3D ? -300 - Math.random() * 200 : 0);
            
            if (is3D) {
                const angleX = (Math.random() - 0.5) * Math.PI;
                const angleY = (Math.random() - 0.5) * Math.PI;
                line.rotation.set(angleX, angleY, 0);
            } else {
                // In 2D, rotate on Z to move on XY plane
                line.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * Math.PI * 2);
            }

            line.userData = { 
                speed: 150 + Math.random() * 250, 
                active: Math.random() > 0.5, 
                delay: Math.random() * 15,
                initialZ: line.position.z 
            };
            
            scene.add(line);
            lines.current.push(line);
        }

        return () => {
            lines.current.forEach(line => {
                scene.remove(line);
                line.geometry.dispose();
            });
            materials.forEach(m => m.dispose());
        };
    }, [scene, is3D]);

    useFrame((state, delta) => {
        lines.current.forEach((line) => {
            if (!line.userData.active) {
                line.userData.delay -= delta;
                if (line.userData.delay <= 0) {
                    line.userData.active = true;
                    // Reset position to be far away or off-screen
                    if (is3D) {
                        line.position.set((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 800, -400 - Math.random() * 200);
                        line.rotation.set((Math.random() - 0.5) * Math.PI, (Math.random() - 0.5) * Math.PI, 0);
                    } else {
                        const side = Math.floor(Math.random() * 4);
                        let x = 0, y = 0;
                        if (side === 0) { x = -400; y = (Math.random() - 0.5) * 800; }
                        else if (side === 1) { x = 400; y = (Math.random() - 0.5) * 800; }
                        else if (side === 2) { x = (Math.random() - 0.5) * 800; y = -400; }
                        else { x = (Math.random() - 0.5) * 800; y = 400; }
                        
                        line.position.set(x, y, 0);
                        line.rotation.set(Math.PI / 2, 0, Math.atan2((Math.random() - 0.5) * 800 - y, (Math.random() - 0.5) * 800 - x));
                    }
                    line.userData.speed = 200 + Math.random() * 300;
                }
            } else {
                line.translateZ(-line.userData.speed * delta);
                
                // Enhanced reset logic: check distance from origin or screen bounds
                const dist = line.position.length();
                if (dist > 1000) {
                    line.userData.active = false;
                    line.userData.delay = 2 + Math.random() * 10;
                }
            }
        });
    });

    return null;
}

export default ThreeLanternNet;

type PactLine = { start: [number, number, number]; end: [number, number, number]; color: string };

function LanternConstellation({ users, currentUserId, is3D, onWarp, intensity, positions, pactLines, pactNameByUser, getPos, selectedId, setSelectedId }: { users: LanternUser[], currentUserId?: string | null, is3D: boolean, onWarp: (v: THREE.Vector3) => void, intensity: number, positions: Map<string, [number, number, number]>, pactLines: PactLine[], pactNameByUser: Map<string, string>, getPos: (user: LanternUser) => [number, number, number], selectedId: string | null, setSelectedId: (id: string | null) => void }) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const me = users.find(u => u.id === 'me');
    const myPos: [number, number, number] = me ? getPos(me) : [0, 0, 0];

    return (
        <group onPointerMissed={() => setSelectedId(null)}>
            {users.map((user) => {
                const isSelf = user.id === 'me';
                const userPos = getPos(user);
                const isConnected = false;
                const pactName = pactNameByUser.get(user.id);
                return (
                    <React.Fragment key={user.id}>
                        <SingleLantern
                            user={user}
                            is3D={is3D}
                            isSelf={isSelf}
                            intensity={intensity}
                            positionOverride={userPos}
                            pactName={pactName}
                            isHovered={hoveredId === user.id}
                            isSelected={selectedId === user.id}
                            setHovered={() => setHoveredId(user.id)}
                            clearHover={() => setHoveredId(null)}
                            onClick={() => {
                                setSelectedId(user.id);
                                const pos = getPos(user);
                                onWarp(new THREE.Vector3(pos[0], pos[1], pos[2]));
                            }}
                        />
                        {isConnected && (
                            <AnimatedSanctuaryLink 
                                start={myPos} 
                                end={userPos} 
                                is3D={is3D} 
                                isSelf={isSelf} 
                                isHosting={user.status === 'hosting'} 
                            />
                        )}
                    </React.Fragment>
                );
            })}
            {pactLines.map((line, index) => (
                <ConstellationLink key={`${line.start.join('-')}-${index}`} start={line.start} end={line.end} color={line.color} is3D={is3D} />
            ))}
        </group>
    );
}

function ConstellationLink({ start, end, color, is3D }: { start: [number, number, number]; end: [number, number, number]; color: string; is3D: boolean }) {
    const lineRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (lineRef.current?.material) {
            lineRef.current.material.dashOffset -= delta * 1.5;
        }
    });

    const threeColor = useMemo(() => new THREE.Color(color), [color]);

    return (
        <Line 
            ref={lineRef}
            points={[start, end]} 
            color={color} 
            transparent 
            opacity={is3D ? 0.8 : 0.6} 
            lineWidth={is3D ? 2.5 : 1.5}
            dashed={true}
            dashSize={0.4}
            gapSize={0.4} 
        />
    );
}

function AnimatedSanctuaryLink({ start, end, is3D, isSelf, isHosting }: {
    start: [number, number, number],
    end: [number, number, number],
    is3D: boolean,
    isSelf: boolean,
    isHosting: boolean
}) {
    const lineRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (!lineRef.current) return;
        const mat = lineRef.current.material as any;
        
        // Let the energy dots flow to the hosted room!
        mat.dashOffset -= delta * (isHosting ? 3.0 : 1.5); 

        if (isHosting) {
            const t = state.clock.elapsedTime * 5;
            mat.lineWidth = 2.5 + Math.sin(t) * 1;
            mat.opacity = 0.7 + Math.sin(t) * 0.2;
        } else {
            mat.lineWidth = 1.5;
            mat.opacity = 0.4;
        }
    });

    if (is3D) {
        return (
            <Line 
                ref={lineRef}
                points={[start, end]} 
                color={isSelf ? "#ff007f" : "#2dd4bf"} 
                transparent 
                opacity={0.4} 
                lineWidth={1}
                dashed={true}
                dashSize={0.8}
                gapSize={0.4}
            />
        );
    }

    return (
        <QuadraticBezierLine
            ref={lineRef}
            start={start}
            end={end}
            mid={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 6, 0] as [number, number, number]}
            color={isSelf ? "#ff007f" : "#2dd4bf"}
            transparent
            opacity={0.4}
            lineWidth={1}
            dashed={true}
            dashSize={0.8}
            gapSize={0.4}
        />
    );
}

function SingleLantern({ user, is3D, isHovered, isSelected, onClick, isSelf, intensity, positionOverride, pactName, setHovered, clearHover }: { 
    user: LanternUser; 
    is3D: boolean; 
    isHovered: boolean; 
    isSelected: boolean; 
    onClick: () => void; 
    isSelf: boolean; 
    intensity: number; 
    positionOverride?: [number, number, number];
    pactName?: string;
    setHovered: () => void; 
    clearHover: () => void; 
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const spriteRef = useRef<THREE.Sprite>(null);
    const groupRef = useRef<THREE.Group>(null);
    const router = useRouter();
    const glowTexture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        return createGlowTexture();
    }, []);

    const fallbackPos: [number, number, number] = [
        (user.gridX - 6) * 12 + (user.jitterX / 8),
        (user.gridY - 6) * 12 + (user.jitterY / 8),
        is3D ? (user.gridZ - 6) * 12 + (user.jitterZ / 8) : 0,
    ];
    const [xPos, yPos, targetZ] = positionOverride || fallbackPos;

    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.position.set(xPos, yPos, targetZ);
        }
    }, [xPos, yPos, targetZ]);

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current || !groupRef.current) return;

        const statusKey = user.status as keyof typeof STATUS_CONFIG;
        const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.idle;

        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, xPos, delta * 3);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, yPos, delta * 3);
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 3);

        // 👇 FIXED: Removed the rogue '4' and added a Math.max to prevent total darkness
        const displayIntensity = Math.max(0.5, intensity);
        const baseIntensity = (isHovered || isSelected ? config.emissive + 5 : config.emissive) * displayIntensity;
        const pulseSpeed = user.status === 'mastering'
            ? config.pulse + (user.focusScore / 100) // 👈 High scorers "shimmer" faster
            : config.pulse;
        const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2 + 1;
        const s = isHovered || isSelected ? config.scale + 0.2 : config.scale;
        meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 4);

        // Use randomized user color instead of status-based color
        const userColor = generateUserColor(user.id);
        const targetColor = new THREE.Color(userColor);

        materialRef.current.color.lerp(targetColor, delta * 4);
        materialRef.current.emissive.lerp(targetColor, delta * 4);

        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
            materialRef.current.emissiveIntensity,
            baseIntensity * pulse,
            delta * 4
        );

        if (spriteRef.current) {
            spriteRef.current.material.opacity = THREE.MathUtils.lerp(
                spriteRef.current.material.opacity,
                (baseIntensity > 10 ? 0.6 : 0.2),
                delta * 2
            );

            const isHighEnergy = ['hosting', 'flowState', 'mastering'].includes(user.status);
            spriteRef.current.material.opacity = THREE.MathUtils.lerp(spriteRef.current.material.opacity, isHighEnergy ? 0.5 : 0.1, delta * 2);
            spriteRef.current.scale.setScalar(THREE.MathUtils.lerp(spriteRef.current.scale.x, isSelf ? 6 : 4, delta * 2));
            spriteRef.current.material.color.lerp(targetColor, delta * 4);
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={isSelf ? 3 : 1.5}>
                {glowTexture && (
                    <sprite ref={spriteRef}>
                        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
                    </sprite>
                )}

                <mesh
                    ref={meshRef}
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(); }}
                    onPointerOut={clearHover}
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                    <sphereGeometry args={[1, 32, 32]} />
                    {/* 👇 Switching to a simpler material setup to guarantee color visibility */}
                    <meshStandardMaterial
                        ref={materialRef}
                        color="#ffffff" // 👈 Base must be white to prevent the black hole look
                        emissive="#ffffff"
                        toneMapped={false} // 👈 Mandatory for the Bloom glow
                        roughness={0.1}
                        metalness={0} // 👈 Setting metalness to 0 stops it from reflecting the black void
                    />
                </mesh>
            </Float>

            <AnimatePresence>
                {(isHovered || isSelected) && (
                    <Html distanceFactor={is3D ? 30 : 45} position={[0, 8, 0]} center className="pointer-events-none" zIndexRange={[50, 100]}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="bg-[var(--bg-dark)]/95 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-3xl w-64 pointer-events-auto shadow-2xl text-[var(--text-main)]"
                            onPointerDown={(e) => e.stopPropagation()}>
                            <div className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-sm">{user.name}</h3>
                                        <p className="text-[9px] font-bold text-[var(--accent-teal)] italic">
                                            {user.hours > 10 ? "The Void Walker" : user.hours > 5 ? "The Deep Thinker" : "The Novice Scholar"}
                                        </p>
                                        <p
                                            className="text-[10px] font-black uppercase tracking-widest mt-0.5"
                                            style={{ color: STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG]?.color || '#fff' }}
                                        >
                                            ● {user.status}
                                        </p>
                                        {pactName && (
                                            <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1">
                                                In a pact: {pactName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-12 h-12 rounded-full border border-[var(--border-color)] overflow-hidden flex-shrink-0 bg-black/40 relative">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt="PFP"
                                                className="w-full h-full object-cover z-20 relative"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-chum');
                                                    if (fallback) fallback.classList.remove('invisible');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`absolute inset-0 flex items-center justify-center p-1 bg-[var(--bg-dark)] fallback-chum ${user.avatarUrl ? 'invisible' : ''}`}>
                                            <ChumRenderer
                                                size="w-full h-full"
                                                activeAccessoriesOverride={user.activeAccessories}
                                                baseColorIdOverride={user.activeBaseColor}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-2xl border border-[var(--border-color)]">
                                    <div className="flex flex-col"><span className="text-[8px] uppercase font-black opacity-40">Total Hours</span><span className="text-xs font-mono font-bold text-[var(--accent-teal)]">{user.hours}h</span></div>
                                    <div className="flex flex-col text-right"><span className="text-[8px] uppercase font-black opacity-40">Focus Score</span><span className="text-xs font-bold text-[var(--accent-yellow)]">{user.focusScore || 0}</span></div>
                                </div>
                                {user.status === 'mastering' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-2xl text-center backdrop-blur-md"
                                    >
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                            </span>
                                            <p className="text-[10px] text-purple-200 font-black uppercase tracking-tighter">AI Shard Active</p>
                                        </div>
                                        <p className="text-[9px] text-purple-300/80 italic">&quot;Generating mastering insights...&quot;</p>
                                    </motion.div>
                                )}
                                {user.status === 'flowState' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-4 p-3 bg-teal-400/10 border border-teal-400/20 rounded-2xl text-center"
                                    >
                                        <p className="text-[10px] text-teal-400 font-black uppercase tracking-widest animate-pulse">
                                            Deep Work Zone
                                        </p>
                                    </motion.div>
                                )}
                                {isSelected && !isSelf && (['hosting', 'joined', 'drafting', 'cafe'].includes(user.status)) && (
                                    <motion.div initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                        <p className="text-[10px] font-black uppercase text-white/40 mb-2">
                                            {user.status === 'drafting' ? 'Blueprint in Progress' : 'Current Sanctuary'}
                                        </p>
                                        <div className="space-y-1 mb-4">
                                            <p className="text-xs font-bold text-white italic">
                                                &quot;{user.roomTitle || 'Quiet Study'}&quot;
                                            </p>
                                            {user.roomDescription && (
                                                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2 italic">
                                                    &quot;{user.roomDescription}&quot;
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (user.roomMode === 'canvas') {
                                                    router.push(`/canvas?room=${user.roomCode}`);
                                                } else {
                                                    router.push(`/room?code=${user.roomCode}`);
                                                }
                                            }}
                                            className="w-full py-3 bg-[var(--accent-teal)] text-black text-xs font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                                        >
                                            {user.status === 'drafting'
                                                ? 'View Blueprint'
                                                : user.roomMode === 'canvas'
                                                ? `Join Canvas [${user.roomCode || '...'}]`
                                                : `Join Sanctuary [${user.roomCode || '...'}]`}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                            {(!user.isVerified && !isSelf) && (
                                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[var(--bg-dark)]/70 border border-[var(--border-color)]">
                                    <p className="text-[8px] font-black uppercase text-[var(--accent-teal)] tracking-widest">Unverified</p>
                                </div>
                            )}
                        </motion.div>
                    </Html>
                )}
            </AnimatePresence>
        </group >
    );
}

function CameraRig({ is3D, controlsRef, warpTarget, onWarpComplete, isFocused, isFreeCam, setIsFreeCam, intensity }: {
    is3D: boolean;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    warpTarget: THREE.Vector3 | null;
    onWarpComplete: () => void;
    isFocused: boolean;
    isFreeCam: boolean;
    setIsFreeCam: React.Dispatch<React.SetStateAction<boolean>>;
    intensity?: number;
}) {
    const isTransitioning = useRef(false);
    const isCancelled = useRef(false);

    const velocity = useRef(new THREE.Vector3());
    const keys = useRef<{ [key: string]: boolean }>({});

    useEffect(() => { isTransitioning.current = true; if (controlsRef.current) controlsRef.current.enabled = false; }, [is3D, controlsRef]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFocused) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const key = e.key.toLowerCase();
            keys.current[key] = true;

            // 🔥 THE FIX: Prevent rapid-fire toggling if the user holds the key down for a split second too long!
            if (!e.repeat && (key === ' ' || key === 'c')) {
                setIsFreeCam((prev: boolean) => !prev);
                e.preventDefault();
            }
            if (warpTarget) {
                isCancelled.current = true;
                onWarpComplete();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (!isFocused) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            keys.current[e.key.toLowerCase()] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [warpTarget, onWarpComplete, isFocused, setIsFreeCam]);

    useEffect(() => {
        const handleWheel = () => {
            if (warpTarget) {
                isCancelled.current = true;
                onWarpComplete();
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [warpTarget, onWarpComplete]);

    useEffect(() => {
        if (warpTarget) isCancelled.current = false;
    }, [warpTarget]);

    useFrame((state, delta) => {
        const cam = state.camera as THREE.PerspectiveCamera;

        cam.fov = THREE.MathUtils.lerp(cam.fov, is3D ? 50 : 30, delta * 3);
        cam.updateProjectionMatrix();

        if (isFreeCam && warpTarget) {
            setIsFreeCam(false);
            isCancelled.current = false;
        }

        if (isFreeCam && is3D && !warpTarget) {
            if (controlsRef.current) controlsRef.current.enabled = true;

            const speed = 60 * delta;
            const damp = Math.pow(0.005, delta);
            const acc = new THREE.Vector3();

            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).normalize();
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion).normalize();

            if (keys.current['w']) acc.add(forward.multiplyScalar(speed));
            if (keys.current['s']) acc.add(forward.multiplyScalar(-speed));
            if (keys.current['a']) acc.add(right.multiplyScalar(-speed));
            if (keys.current['d']) acc.add(right.multiplyScalar(speed));
            if (keys.current['e']) acc.add(up.multiplyScalar(speed));
            if (keys.current['q']) acc.add(up.multiplyScalar(-speed));

            velocity.current.add(acc);
            velocity.current.multiplyScalar(damp);

            cam.position.add(velocity.current);
            if (controlsRef.current) {
                controlsRef.current.target.add(velocity.current);
                controlsRef.current.update();
            }
        } else {
            if (controlsRef.current && !isTransitioning.current) controlsRef.current.enabled = true;
            velocity.current.set(0, 0, 0);

            const transSpeed = delta * 4;
            if (warpTarget && !isCancelled.current) {
                const offset = new THREE.Vector3(0, 0, 40);
                const targetPos = warpTarget.clone().add(offset);
                cam.position.lerp(targetPos, transSpeed);
                if (controlsRef.current) {
                    controlsRef.current.target.lerp(warpTarget, transSpeed);
                    controlsRef.current.update();
                }
                if (cam.position.distanceTo(targetPos) < 1) onWarpComplete();
            } else if (isTransitioning.current) {
                const targetPos = is3D ? new THREE.Vector3(0, 10, 80) : new THREE.Vector3(0, 0, 120);
                cam.position.lerp(targetPos, transSpeed);
                if (controlsRef.current) {
                    controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), transSpeed);
                    controlsRef.current.update();
                }
                if (cam.position.distanceTo(targetPos) < 1) {
                    isTransitioning.current = false;
                }
            }
        }
    });

    // 🔥 We return null here because the HUD is now perfectly anchored outside the canvas!
    return null;
}

function PulseWave() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        // Expand and fade a ring every 4 seconds
        const s = (clock.elapsedTime % 4) * 40;
        meshRef.current.scale.setScalar(s);
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - (s / 100));
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1, 1.1, 64]} />
            <meshBasicMaterial color="#2dd4bf" transparent opacity={0} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

function GlobalPulse() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        // Ripple every 5 seconds
        const cycle = (clock.elapsedTime % 5) / 5;
        const s = cycle * 150; // Expansion size
        meshRef.current.scale.setScalar(s);

        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.pow(1 - cycle, 2) * 0.3; // Fade out quadratically
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1, 1.05, 64]} />
            <meshBasicMaterial color="#2dd4bf" transparent opacity={0} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

function FloatingParticles({ size, color, count, spread }: { size: number, color: string, count: number, spread: number }) {
    const ref = useRef<THREE.Points>(null);

    const sphere = useMemo(() => {
        const positions = new Float32Array(count * 3);
        // Using a simple seeded random for purity
        let seed = 42;
        const seededRandom = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (seededRandom() - 0.5) * spread;
        }
        return positions;
    }, [count, spread]);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 15;
            ref.current.rotation.y -= delta / 20;
        }
    });

    return (
        <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color={color}
                size={size}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.4}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

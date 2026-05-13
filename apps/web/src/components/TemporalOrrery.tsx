"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
    OrbitControls, 
    PerspectiveCamera, 
    Float, 
    Text, 
    ContactShadows,
    Sparkles,
    BakeShadows,
    Preload,
    Html
} from "@react-three/drei";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import * as THREE from "three";
import { useStudyStore, Task } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

// ─── INTERACTIVE WRAPPER ──────────────────────────────────────

function MiniTaskDraggable({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: { ...task, isCargo: true } // Tag as cargo for the overlay
    });

    return (
        <div 
            ref={setNodeRef} 
            {...listeners} 
            {...attributes}
            className={`p-4 bg-[#064e4b]/80 border border-[#2dd4bf]/20 rounded-2xl cursor-grab active:cursor-grabbing hover:border-[#2dd4bf]/50 transition-all ${isDragging ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="flex items-center gap-3">
                {/* Barrel Icon */}
                <div className="w-8 h-8 rounded-lg bg-[#451a03] border border-[#2dd4bf]/20 flex items-center justify-center shrink-0">
                    <div className="w-4 h-5 border-y border-white/20" />
                </div>
                <div>
                    <div className="text-[10px] font-black text-[#2dd4bf] uppercase tracking-tighter mb-0.5">{task.load} CARGO</div>
                    <div className="text-xs font-bold text-white leading-tight truncate w-40">{task.title}</div>
                </div>
            </div>
        </div>
    );
}

// ─── NAUTICAL ASSETS ──────────────────────────────────────────────────

function CargoBarrel({ i }: { i: number }) {
    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.3}>
            <mesh position={[
                0.8 + Math.cos(i * 0.8) * 0.4,
                0.4,
                0.8 + Math.sin(i * 0.8) * 0.4
            ]}>
                <cylinderGeometry args={[0.15, 0.15, 0.35, 8]} />
                <meshStandardMaterial color="#451a03" roughness={1} />
            </mesh>
        </Float>
    );
}

function SafeHarbor({ tasks, showParticles }: { tasks: Task[], showParticles: boolean }) {
    const lightRef = useRef<THREE.PointLight>(null);
    
    useFrame((state) => {
        if (lightRef.current) {
            lightRef.current.intensity = 2 + Math.sin(state.clock.getElapsedTime() * 3) * 0.5;
        }
    });

    return (
        <group position={[0, -1, 0]}>
            {showParticles && <Sparkles count={50} scale={5} size={1} speed={0.2} color="#fcd34d" />}
            
            {/* Lighthouse Cliff */}
            <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[2.5, 3, 2, 8]} />
                <meshStandardMaterial color="#0f172a" roughness={1} />
            </mesh>

            {/* The Pier / Dock */}
            <mesh position={[2, -0.4, 0]}>
                <boxGeometry args={[3, 0.2, 1.5]} />
                <meshStandardMaterial color="#451a03" roughness={1} />
            </mesh>

            {/* The Lighthouse */}
            <group position={[0, 0.5, 0]}>
                <mesh position={[0, 1.2, 0]}>
                    <cylinderGeometry args={[0.4, 0.5, 2.5, 8]} />
                    <meshStandardMaterial color="#f1f5f9" />
                </mesh>
                <mesh position={[0, 2.5, 0]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.3, 8]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
                <pointLight ref={lightRef} position={[0, 2.6, 0]} color="#fcd34d" distance={15} />
            </group>

            {/* Cargo Barrels on the Dock */}
            {tasks.map((task, i) => (
                <CargoBarrel key={task.id} i={i} />
            ))}
            
            <Text
                position={[0, 5, 0]}
                fontSize={0.4}
                color="#fcd34d"
                anchorX="center"
                anchorY="middle"
            >
                SAFE HARBOR
            </Text>
        </group>
    );
}

function VoyageShip({ load }: { load: string }) {
    const woodColor = "#451a03";
    const sailColor = "#f1f5f9";
    const glowColor = load === 'heavy' ? "#f87171" : load === 'medium' ? "#2dd4bf" : "#fbbf24";
    
    return (
        <group position={[0, 0.1, 0]}>
            <Float speed={2.5} rotationIntensity={0.5} floatIntensity={0.2}>
                {load === 'heavy' && (
                    <group>
                        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.7, 0.2, 0.4]} /><meshStandardMaterial color={woodColor} /></mesh>
                        {[-0.2, 0, 0.2].map((x, i) => (
                            <group key={i} position={[x, 0.4, 0]}>
                                <mesh><cylinderGeometry args={[0.015, 0.015, 0.8, 6]} /><meshStandardMaterial color={woodColor} /></mesh>
                                <mesh position={[0, 0.1, 0.05]}><boxGeometry args={[0.3, 0.4, 0.01]} /><meshStandardMaterial color={sailColor} emissive={glowColor} emissiveIntensity={0.5} /></mesh>
                            </group>
                        ))}
                    </group>
                )}
                {load === 'medium' && (
                    <group>
                        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.5, 0.15, 0.25]} /><meshStandardMaterial color={woodColor} /></mesh>
                        <group position={[0, 0.35, 0]}>
                            <mesh><cylinderGeometry args={[0.015, 0.015, 0.6, 6]} /><meshStandardMaterial color={woodColor} /></mesh>
                            <mesh position={[0, 0.1, 0.05]} rotation={[0, 0.2, 0]}><boxGeometry args={[0.25, 0.45, 0.01]} /><meshStandardMaterial color={sailColor} emissive={glowColor} emissiveIntensity={0.3} /></mesh>
                        </group>
                    </group>
                )}
                {load === 'light' && (
                    <group>
                        <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.35, 0.1, 0.2]} /><meshStandardMaterial color={woodColor} /></mesh>
                        <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color={woodColor} /></mesh>
                    </group>
                )}
            </Float>
        </group>
    );
}

function IslandBuoy({ 
    position, 
    date, 
    tasks, 
    isToday, 
    onSelect
}: { 
    position: [number, number, number], 
    date: Date, 
    tasks: Task[], 
    isToday: boolean,
    onSelect: (date: Date, tasks: Task[]) => void
}) {
    const [hovered, setHovered] = useState(false);
    const { setNodeRef, isOver } = useDroppable({ id: `date-${date.toISOString().split('T')[0]}` });
    
    return (
        <group position={position}>
            <Html center position={[0, 0, 0]} pointerEvents="none">
                <div 
                    ref={setNodeRef}
                    className={`w-20 h-20 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${isOver ? 'bg-white/20 scale-110 border-2 border-dashed border-white shadow-[0_0_30px_white]' : ''}`}
                    onClick={() => onSelect(date, tasks)}
                />
            </Html>

            <Text
                position={[0, 1.4, 0]}
                fontSize={0.25}
                color={isToday ? "#2dd4bf" : "#64748b"}
                anchorX="center"
                anchorY="middle"
            >
                {date.getDate()}
            </Text>

            <mesh position={[0, -0.4, 0]} rotation={[0, date.getDate(), 0]}>
                <cylinderGeometry args={[1, 1.2, 0.5, 6]} />
                <meshStandardMaterial color="#0f172a" roughness={1} />
            </mesh>

            <group position={[0.6, 0.1, 0.6]}>
                <mesh>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshStandardMaterial color="#2dd4bf" transparent opacity={0.6} metalness={1} roughness={0} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.5]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[0.05, 0.4, 0]}>
                    <boxGeometry args={[0.15, 0.12, 0.01]} />
                    <meshStandardMaterial color={isToday ? "#2dd4bf" : "#475569"} />
                </mesh>
            </group>

            {/* The Ship (Anchored in the water next to the island) */}
            {tasks.length > 0 && (
                <group position={[-1.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <VoyageShip load={tasks[0].load} />
                </group>
            )}

            {(isToday || hovered) && (
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                    <torusGeometry args={[1.2, 0.01, 16, 32]} />
                    <meshBasicMaterial color="#2dd4bf" transparent opacity={0.4} />
                </mesh>
            )}
        </group>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function TemporalOrrery() {
    const { tasks, performanceSettings, accessibilitySettings } = useStudyStore();
    const [selectedDay, setSelectedDay] = useState<{ date: Date, tasks: Task[] } | null>(null);

    const stashedTasks = useMemo(() => tasks.filter(t => !t.deadline && !t.isCompleted), [tasks]);
    
    const showParticles = performanceSettings?.showParticles ?? true;
    const reducedMotion = accessibilitySettings?.reducedMotion ?? false;
    const autoRotate = !reducedMotion && (performanceSettings?.mode !== 'low');

    const orreryData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weeks = [];
        for (let w = 0; w < 4; w++) {
            const days = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(today);
                date.setDate(today.getDate() + (w * 7) + d);
                const dateStr = date.toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr) && !t.isCompleted);
                days.push({ date, isToday: w === 0 && d === 0, tasks: dayTasks });
            }
            weeks.push(days);
        }
        return weeks;
    }, [tasks]);

    return (
        <div className="relative w-full h-full bg-[#020617] rounded-3xl overflow-hidden flex flex-col">
            
            {/* 3D CANVAS LAYER */}
            <div className="absolute inset-0 z-0">
                <Canvas 
                    shadows={performanceSettings?.mode !== 'low'} 
                    dpr={[1, 2]}
                    gl={{ antialias: performanceSettings?.antialiasing ?? true }}
                >
                    <PerspectiveCamera makeDefault position={[0, 10, 22]} fov={35} />
                    <OrbitControls 
                        enablePan={false} 
                        maxPolarAngle={Math.PI / 2.2} 
                        minDistance={10} 
                        maxDistance={35}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.03}
                    />
                    
                    <ambientLight intensity={1} />
                    <pointLight position={[10, 15, 10]} intensity={2} />
                    <hemisphereLight intensity={0.6} color="#2dd4bf" groundColor="#000000" />
                    <spotLight position={[0, 20, 0]} angle={0.4} penumbra={1} intensity={2.5} color="#fcd34d" />
                    
                    <color attach="background" args={["#020617"]} />
                    <fog attach="fog" args={["#020617", 20, 60]} />

                    <group position={[0, -1, 0]}>
                        {orreryData.map((week, i) => (
                            <group key={i} position={[0, 0, 0]}>
                                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
                                    <torusGeometry args={[radiusForWeek(i), 0.03, 8, 64]} />
                                    <meshBasicMaterial color="#2dd4bf" transparent opacity={0.05} />
                                </mesh>
                                {week.map((day, j) => {
                                    const radius = radiusForWeek(i);
                                    const angle = (j / 7) * Math.PI * 2;
                                    const x = Math.cos(angle) * radius;
                                    const z = Math.sin(angle) * radius;
                                    return (
                                        <IslandBuoy 
                                            key={day.date.toISOString()}
                                            position={[x, 0, z]} 
                                            date={day.date}
                                            isToday={day.isToday}
                                            tasks={day.tasks}
                                            onSelect={(date, tasks) => setSelectedDay({ date, tasks })}
                                        />
                                    );
                                })}
                            </group>
                        ))}
                    </group>

                    <SafeHarbor tasks={stashedTasks} showParticles={showParticles} />

                    <ContactShadows position={[0, -4, 0]} opacity={0.3} scale={70} blur={2.5} far={20} />
                    <BakeShadows />
                    <Preload all />
                </Canvas>
            </div>

            {/* 2D CARGO MANIFEST */}
            <div className="absolute top-1/2 -translate-y-1/2 left-8 w-80 h-[75%] z-20 pointer-events-none">
                <div className="flex flex-col h-full bg-[#020617]/80 backdrop-blur-3xl border border-[#2dd4bf]/20 rounded-[40px] p-8 shadow-2xl pointer-events-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#fcd34d] shadow-[0_0_10px_#fcd34d]" />
                        <h2 className="text-xs font-black text-[#2dd4bf] uppercase tracking-[0.4em]">Cargo Manifest</h2>
                        <span className="ml-auto text-xs font-bold text-white/30">{stashedTasks.length} Units</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        <AnimatePresence>
                            {stashedTasks.map(task => (
                                <motion.div 
                                    key={task.id} 
                                    initial={{ opacity: 0, x: -20 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <MiniTaskDraggable task={task} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {stashedTasks.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/10 text-center py-20">
                                <p className="text-sm font-bold uppercase tracking-widest italic">All Cargo Deployed</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* HUD & OVERLAYS */}
            <div className="absolute top-8 left-8 pointer-events-none z-20">
                <div className="text-[12px] font-black text-[#2dd4bf] uppercase tracking-[0.5em] mb-1">Expedition: Active Course</div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Temporal Sea Archive</div>
            </div>

            <AnimatePresence>
                {selectedDay && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-8 right-8 w-80 bg-[#020617]/90 backdrop-blur-3xl border border-[#2dd4bf]/20 rounded-[40px] p-8 z-50 shadow-[0_0_100px_rgba(45,212,191,0.1)]"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <div className="text-[10px] font-black text-[#2dd4bf] uppercase tracking-widest mb-1">Island Log</div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedDay.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setSelectedDay(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {selectedDay.tasks.map(task => (
                                <div key={task.id} className="p-4 bg-white/5 rounded-[24px] border border-white/5 hover:border-[#2dd4bf]/30 transition-all group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${task.load === 'heavy' ? 'bg-red-400' : 'bg-teal-400'}`} />
                                        <div className="text-[9px] font-black text-white/40 uppercase tracking-tighter">{task.load} Vessel</div>
                                    </div>
                                    <div className="text-sm font-bold text-white leading-snug group-hover:text-[#2dd4bf] transition-colors">{task.title}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-6 left-8 pointer-events-none z-20">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                    Chart your course • Drag Cargo to Islands
                </div>
            </div>
        </div>
    );
}

function radiusForWeek(i: number) {
    return 6 + (i * 4);
}

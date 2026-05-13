"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useStudyStore, TaskLoad, Task } from "@/store/useStudyStore";
import { Sprout, Search, ChevronDown, X, Sparkles, Crosshair, Clock, BrainCircuit, Maximize2, Minimize2, CheckCircle2, Check, Plus, Moon, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import TaskCard from "@/components/TaskCard";
import MorningPlanningModal from "@/components/MorningPlanningModal";
import UnDoneModal from "@/components/UnDoneModal";
import GeodeScene from "@/components/GeodeScene";
import { useTerms } from "@/hooks/useTerms";
import { playChime } from "@/lib/sound";
import confetti from 'canvas-confetti';

import { Shard } from "@/store/useStudyStore";
import { SquishyButton, ConfirmationModal } from "@studybuddy/ui";

// DropZoneContainer removed (was unused)

interface MasteryContainerProps {
    id: string;
    masteryTab: 'tasks' | 'shards' | 'crystals';
    setMasteryTab: (tab: 'tasks' | 'shards' | 'crystals') => void;
    children: React.ReactNode;
    isEmpty: boolean;
    emptyText: string;
}

function MasteryContainer({ id, masteryTab, setMasteryTab, children, isEmpty, emptyText }: MasteryContainerProps) {
    const { isOver, setNodeRef } = useDroppable({ id });
    const { terms } = useTerms();
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col h-full">


            <div className="flex justify-between items-center mb-4 shrink-0 gap-4">
                <SquishyButton onClick={() => setMasteryTab('tasks')} className={`flex-1 pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${masteryTab === 'tasks' ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'}`}>{terms.archive}</SquishyButton>
                <SquishyButton onClick={() => setMasteryTab('shards')} className={`flex-1 pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${masteryTab === 'shards' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'}`}>{terms.shards}</SquishyButton>
                <SquishyButton onClick={() => setMasteryTab('crystals')} className={`flex-1 pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${masteryTab === 'crystals' ? 'border-[var(--accent-yellow)] text-[var(--accent-yellow)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'}`}>Crystals</SquishyButton>
            </div>
            {/* STYLING FIX: Invisible scrollbars applied */}
            <div ref={setNodeRef} className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-2 border-dashed ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]" : "bg-[var(--bg-dark)] border-[var(--border-color)]/50"}`}>
                {isEmpty ? <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium text-center px-4">{emptyText}</div> : children}
            </div>
        </div>
    );
}

function MasteredShardCard({ shard, onSnipe }: { shard: Shard, onSnipe: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            whileHover={{ scale: 1.05, y: -4, rotateY: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            // STYLING FIX: Removed overflow-hidden so shadows can bleed out
            className="relative p-5 rounded-2xl border border-[var(--accent-teal)]/40 bg-[#0b1211] group cursor-pointer shadow-[0_4px_20px_rgba(20,184,166,0.05)] hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]"
            onClick={onSnipe}
        >
            {/* STYLING FIX: The sweeping animation is now safely contained in an absolute background layer */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--accent-teal)]/10" />
                <motion.div
                    animate={{ x: ["-200%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-teal)]/20 to-transparent skew-x-12"
                />
            </div>

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[var(--accent-teal)] animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-teal)]">Ascended Knowledge</span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight pr-4">{shard.title}</h4>
                </div>

                {/* STYLING FIX: Clean icon button replaces the 100% circle and full overlay */}
                <button
                    onClick={(e) => { e.stopPropagation(); onSnipe(); }}
                    className="w-10 h-10 shrink-0 rounded-full bg-[var(--accent-teal)] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:brightness-125 shadow-[0_0_15px_var(--accent-teal)]"
                    title="Snipe View"
                >
                    <Crosshair size={18} />
                </button>
            </div>
        </motion.div>
    );
}

function MasteredCrystalCard({ name, masteredAt }: { name: string; masteredAt: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="relative p-4 rounded-2xl border border-[var(--accent-yellow)]/40 bg-[#14110b] shadow-[0_6px_24px_rgba(234,179,8,0.1)]"
        >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--accent-yellow)] mb-2">
                <Sparkles size={12} className="text-[var(--accent-yellow)]" /> Crystal Mastery
            </div>
            <div className="text-sm font-bold text-white">{name}</div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                {new Date(masteredAt).toLocaleDateString()}
            </div>
        </motion.div>
    );
}

// ==========================================
// 🎨 FRAMEWORK UI COMPONENTS
// ==========================================

type FrameworkSelection = 'eisenhower' | '1-3-5' | 'ivy' | 'standard';

interface MatrixZoneProps {
    id: string;
    title: string;
    subtitle: string;
    tasks: Task[];
    color: string;
    bg: string;
    border: string;
    activeBorder: string;
    onToggleSelect: (id: string) => void;
    selectedIds: string[];
    animatingTaskId: string | null;
    recentlyCompletedTaskId: string | null;
}

function MatrixZone({ id, title, subtitle, tasks, color, bg, border, activeBorder, onToggleSelect, selectedIds, animatingTaskId, recentlyCompletedTaskId }: MatrixZoneProps) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`flex flex-col rounded-2xl border-2 transition-all duration-300 ${isOver ? activeBorder + ' bg-black/40 ring-1 ring-current brightness-125 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)] z-10' : border + ' ' + bg}`}>
            <div className={`p-2 sm:p-3 border-b ${border} bg-black/20 shrink-0 rounded-t-xl`}>
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${color} flex items-center justify-between`}>
                    {title} <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-md">{tasks.length}</span>
                </h3>
                <p className="text-[8px] sm:text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 hidden sm:block">{subtitle}</p>
            </div>
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 p-2 sm:p-3 overflow-y-auto overflow-x-hidden space-y-2 [&::-webkit-scrollbar]:hidden rounded-b-xl pb-12">
                {tasks.map((task: Task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onToggleSelect={onToggleSelect}
                        selected={selectedIds.includes(task.id)}
                        completionEffect="glide"
                        isAnimating={animatingTaskId === task.id}
                    />
                ))}
            </div>
        </div>
    );
}

function IvySlot({ rank, task, isLocked, isActive, onToggleSelect, selectedIds, animatingTaskId, recentlyCompletedTaskId }: {
    rank: number;
    task: Task | null;
    isLocked: boolean;
    isActive: boolean;
    onToggleSelect: (id: string) => void;
    selectedIds: string[];
    animatingTaskId: string | null;
    recentlyCompletedTaskId: string | null;
}) {
    const id = `ivy-${rank}`;
    const { isOver, setNodeRef } = useDroppable({ id, disabled: isLocked && !!task });
    return (
        <div ref={setNodeRef} className={`relative rounded-2xl border-2 transition-all duration-300 flex w-full h-auto min-h-[72px] ${
            // THE CLIPPING FIX: Removed 'ring-1' and replaced with safe 'shadow-[inset_...]'
            isOver ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 brightness-125 shadow-[inset_0_0_30px_rgba(20,184,166,0.15)] z-10' :
                isActive ? 'border-[var(--accent-teal)]/50 bg-[var(--bg-card)] shadow-[0_0_20px_rgba(20,184,166,0.15)]' :
                    isLocked ? 'border-[var(--border-color)]/30 bg-[var(--bg-dark)]/50 grayscale opacity-50' :
                        'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
            }`}>
            <div className={`w-12 sm:w-14 shrink-0 flex items-center justify-center font-black text-2xl border-r-2 border-inherit rounded-l-2xl transition-colors ${isActive ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'}`}>
                {rank}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* THE MINIMIZED FIX: Passing the new prop to the TaskCard! */}
                {task ? (
                        <TaskCard
                            task={task}
                            locked={isLocked}
                            isMinimized={true}
                            onToggleSelect={onToggleSelect}
                            selected={selectedIds.includes(task.id)}
                            completionEffect="glide"
                            isAnimating={animatingTaskId === task.id}
                            layoutId={task.id}
                            isRecentlyCompleted={recentlyCompletedTaskId === task.id}
                        />
                ) : (
                    <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] italic">Awaiting Assignment...</div>
                )}
            </div>

            {isActive && !task && (
                <div className="absolute inset-0 rounded-2xl border-2 border-[var(--accent-teal)] animate-pulse pointer-events-none" />
            )}
        </div>
    );
}

interface DropdownCapacityZoneProps {
    loadType: TaskLoad;
    title: string;
    max: number;
    allTasks: Task[];
    color: string;
    bg: string;
    border: string;
    updateTask: (id: string, updates: Partial<Task>) => void;
    onToggleSelect: (id: string) => void;
    selectedIds: string[];
    animatingTaskId: string | null;
    recentlyCompletedTaskId: string | null;
}

function DropdownCapacityZone({ loadType, title, max, allTasks, color, bg, border, updateTask, onToggleSelect, selectedIds, animatingTaskId, recentlyCompletedTaskId }: DropdownCapacityZoneProps) {
    const [isOpen, setIsOpen] = useState(false);

    // 1. Filter all tasks by cognitive load (Heavy/Medium/Light)
    const categoryTasks = allTasks.filter((t: Task) => t.load === loadType);

    // 2. Separate into "Equipped" (Pinned) and "Backlog" (Unpinned)
    const selectedTasks = categoryTasks.filter((t: Task) => t.isPinned);
    const availableTasks = categoryTasks.filter((t: Task) => !t.isPinned);

    const isFull = selectedTasks.length >= max;

    // 🎨 THE FIX: Hardcoded standard colors to bypass the CSS Variable Opacity bug
    // Added 'cardBase' and 'wrapperBorder' to theme the actual task containers!
    const themeMap = {
        heavy: {
            btnBg: 'bg-red-400/20', btnText: 'text-red-400', btnHover: 'hover:bg-red-400 hover:text-black',
            cardBase: 'border-red-400/30 bg-red-400/5',
            cardHover: 'hover:border-red-400/60 hover:bg-red-400/10',
            dropdownBg: 'bg-red-400/5',
            wrapperBorder: 'border-red-400/30'
        },
        medium: {
            btnBg: 'bg-yellow-400/20', btnText: 'text-yellow-400', btnHover: 'hover:bg-yellow-400 hover:text-black',
            cardBase: 'border-yellow-400/30 bg-yellow-400/5',
            cardHover: 'hover:border-yellow-400/60 hover:bg-yellow-400/10',
            dropdownBg: 'bg-yellow-400/5',
            wrapperBorder: 'border-yellow-400/30'
        },
        light: {
            btnBg: 'bg-teal-400/20', btnText: 'text-teal-400', btnHover: 'hover:bg-teal-400 hover:text-black',
            cardBase: 'border-teal-400/30 bg-teal-400/5',
            cardHover: 'hover:border-teal-400/60 hover:bg-teal-400/10',
            dropdownBg: 'bg-teal-400/5',
            wrapperBorder: 'border-teal-400/30'
        }
    };
    const theme = themeMap[loadType as keyof typeof themeMap] || themeMap.light;

    return (
        <div className={`flex flex-col rounded-2xl border-2 transition-all duration-300 ${border} ${bg}`}>
            {/* Header / Click to Expand */}
            <div
                className={`p-3 sm:p-4 flex justify-between items-center shrink-0 border-b border-inherit bg-black/10 cursor-pointer hover:bg-black/20 transition-colors ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${color}`}>{title}</h3>
                <div className="flex items-center gap-3">
                    <div className={`text-xs font-black px-2 py-1 rounded-md transition-colors ${isFull ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-black/30 text-[var(--text-muted)] border border-white/5'}`}>
                        {selectedTasks.length} / {max}
                    </div>
                    <ChevronDown className={`transition-transform duration-300 text-[var(--text-muted)] ${isOpen ? 'rotate-180' : ''}`} size={16} />
                </div>
            </div>

            {/* Dropdown Menu (Available Tasks Backlog) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`overflow-hidden border-b border-inherit bg-black/60 ${theme.dropdownBg}`}
                    >
                        <div className="p-3 max-h-48 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden">
                            {availableTasks.length === 0 ? (
                                <div className="text-center text-xs text-[var(--text-muted)] italic py-4">No unassigned {loadType} quests.</div>
                            ) : (
                                availableTasks.map((task: Task) => (
                                    // 🎨 Task Container inside dropdown now uses thematic base colors!
                                    <div key={task.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300 cursor-default ${theme.cardBase} ${theme.cardHover}`}>
                                        <span className="text-xs font-bold text-white truncate max-w-[75%] pr-2">{task.title}</span>
                                        <button
                                            disabled={isFull}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateTask(task.id, { isPinned: true }); // Marks as "Equipped"
                                            }}
                                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all shadow-md ${isFull ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none' : `${theme.btnBg} ${theme.btnText} ${theme.btnHover}`}`}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Equipped Tasks Display */}
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className={`flex-1 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-3 [&::-webkit-scrollbar]:hidden min-h-[120px] rounded-b-xl ${isOpen ? 'pb-4' : 'pb-8'}`}>
                {selectedTasks.map((task: Task) => (
                    <div key={task.id} className="relative group animate-in fade-in zoom-in duration-300">
                        {/* 🎨 Wrapped the equipped TaskCard in a thematic border to match the zone */}
                        <div className={`rounded-xl border-2 p-1 bg-black/20 transition-all ${theme.wrapperBorder}`}>
                            <TaskCard
                                task={task}
                                onToggleSelect={onToggleSelect}
                                selected={selectedIds.includes(task.id)}
                                completionEffect="glide"
                                isAnimating={animatingTaskId === task.id}
                                layoutId={task.id}
                                isRecentlyCompleted={recentlyCompletedTaskId === task.id}
                            />
                        </div>
                        {/* X Button to un-equip */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateTask(task.id, { isPinned: false }); // Un-equips task
                            }}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:scale-110 hover:bg-red-500 shadow-lg z-10"
                            title="Remove from today's plan"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                {selectedTasks.length === 0 && !isOpen && (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest italic opacity-50">
                        Click header to equip
                    </div>
                )}
            </div>
        </div>
    );
}

function UnsortedZone({ id, tasks, title = "Unsorted Quests", onViewAll, onToggleSelect, selectedIds, animatingTaskId, recentlyCompletedTaskId }: {
    id: string;
    tasks: Task[];
    title?: string;
    onViewAll?: () => void;
    onToggleSelect: (id: string) => void;
    selectedIds: string[];
    animatingTaskId: string | null;
    recentlyCompletedTaskId: string | null;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`h-full flex flex-col rounded-2xl border-2 border-dashed transition-all duration-300 ${isOver ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 ring-1 ring-[var(--accent-teal)] brightness-125' : 'border-[var(--border-color)] bg-[var(--bg-dark)]'}`}>
            <div className="p-2 sm:p-3 border-b border-[var(--border-color)]/50 shrink-0 bg-black/20 rounded-t-xl">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        {title}
                        <span className="bg-black/40 px-2 py-0.5 rounded text-[9px]">{tasks.length}</span>
                    </div>
                    {tasks.length > 5 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (onViewAll) onViewAll(); }}
                            className="text-[var(--accent-teal)] hover:text-white transition-colors flex items-center gap-1 group"
                        >
                            <span className="group-hover:underline">View All</span>
                            <Maximize2 size={10} />
                        </button>
                    )}
                </h3>
            </div>
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 p-2 sm:p-3 overflow-y-auto overflow-x-hidden space-y-2 [&::-webkit-scrollbar]:hidden min-h-[100px] rounded-b-xl pb-12">
                {tasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest italic opacity-50">All Quests Assigned</div>
                ) : (
                    tasks.map((task: Task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onToggleSelect={onToggleSelect}
                            selected={selectedIds.includes(task.id)}
                            completionEffect="glide"
                            isAnimating={animatingTaskId === task.id}
                            layoutId={task.id}
                            isRecentlyCompleted={recentlyCompletedTaskId === task.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function StandardZone({ id, tasks, onToggleSelect, selectedIds, animatingTaskId, recentlyCompletedTaskId }: {
    id: string;
    tasks: Task[];
    onToggleSelect: (id: string) => void;
    selectedIds: string[];
    animatingTaskId: string | null;
    recentlyCompletedTaskId: string | null;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className={`absolute inset-0 rounded-xl transition-all duration-300 flex flex-col gap-3 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden border-2 border-dashed p-1 min-h-[150px] pb-16 ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)] ring-1 ring-[var(--accent-teal)] brightness-110 z-10" : "border-transparent"}`}>
            {tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">No active quests yet</div>
            ) : (
                tasks.map((task: Task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onToggleSelect={onToggleSelect}
                        selected={selectedIds.includes(task.id)}
                        completionEffect="glide"
                        isAnimating={animatingTaskId === task.id}
                        layoutId={task.id}
                        isRecentlyCompleted={recentlyCompletedTaskId === task.id}
                    />
                ))
            )}
        </div>
    );
}

export default function CrystalGarden() {
    const {
        tasks, shards, activeFramework, setActiveFramework, isInitialized, lastPlannedDate,
        completeTask, deleteTask, addTask, updateTask, triggerChumToast, isPremiumUser,
        protocolLimits, updateProtocolLimits,
        crystalGrowth, masteredCrystals, rebirthCrystal,
        setSettings
    } = useStudyStore();

    const { terms, isGamified } = useTerms();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [showMorningModal, setShowMorningModal] = useState(false);
    const [showUnDoneModal, setShowUnDoneModal] = useState(false);
    const [showProtocolSettings, setShowProtocolSettings] = useState(false);
    const [showUnrankedModal, setShowUnrankedModal] = useState(false);
    const [draggedToMasteryTask, setDraggedToMasteryTask] = useState<Task | null>(null);
    const [masteryTab, setMasteryTab] = useState<'tasks' | 'shards' | 'crystals'>('tasks');
    // Removed draggedToGeodeTask and setDraggedToGeodeTask as they are unused
    const [snipingShard, setSnipingShard] = useState<Shard | null>(null);
    const [isCrystalMasteryOpen, setIsCrystalMasteryOpen] = useState(false);
    const [isRebirthing, setIsRebirthing] = useState(false);
    const [crystalNameInput, setCrystalNameInput] = useState('');
    const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
    const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
    const lastGrowthRef = useRef(crystalGrowth);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const handleToggleSelect = (id: string) => {
        setSelectedTaskIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleBulkComplete = async () => {
        if (selectedTaskIds.length === 0) return;
        for (const id of selectedTaskIds) {
            completeTask(id);
        }
        setSelectedTaskIds([]);
        triggerChumToast(`${selectedTaskIds.length} quests archived!`);
    };

    const handleBulkDelete = () => {
        if (selectedTaskIds.length === 0) return;
        setShowBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        if (selectedTaskIds.length === 0) return;
        for (const id of selectedTaskIds) {
            deleteTask(id);
        }
        setSelectedTaskIds([]);
        setShowBulkDeleteConfirm(false);
        triggerChumToast(`${selectedTaskIds.length} quests recycled.`);
    };

    const validTasks: Task[] = tasks.filter((t: Task) => t && t.id);
    const filteredTasks: Task[] = validTasks.filter((t: Task) =>
        (t.title?.toLowerCase()?.includes(searchQuery.toLowerCase())) ||
        (t.description?.toLowerCase()?.includes(searchQuery.toLowerCase()))
    );

    // These are for the UI Columns (affected by search)
    const activeQuests: Task[] = filteredTasks.filter((t: Task) => !t.isCompleted);
    // Use a stable value for 'now' to avoid impure function in render
    const [now] = useState(() => Date.now());

    const getPhaseValue = (t: Task) => {
        const deadline = t.deadline;
        if (!deadline) return 0;
        const diff = (new Date(deadline as string).getTime() - now) / 3600000;
        if (diff < 0) return 4; // Overdue
        if (diff <= 2) return 3; // Critical
        if (diff <= 12) return 2; // Soon
        return 1; // Later
    };

    const sortedQuests = [...activeQuests].sort((a, b) => {
        // 1. Frog Priority
        if (a.isFrog !== b.isFrog) return b.isFrog ? 1 : -1;
        // 2. Deadline Phase Priority
        const phaseA = getPhaseValue(a);
        const phaseB = getPhaseValue(b);
        if (phaseA !== phaseB) return phaseB - phaseA;
        // 3. Pin Priority (if any)
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return 0;
    });
    const archivedQuests: Task[] = filteredTasks
        .filter((t: Task) => t.isCompleted)
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
    const masteredShards: Shard[] = shards.filter((s: Shard) => s.isMastered);

    useEffect(() => {
        if (lastGrowthRef.current < 100 && crystalGrowth >= 100) {
            setIsCrystalMasteryOpen(true);
        }
        lastGrowthRef.current = crystalGrowth;
    }, [crystalGrowth]);

    const completionRatio = Math.min(1, Math.max(0, crystalGrowth / 100));

    const [showFrameworkMenu, setShowFrameworkMenu] = useState(false);
    const [pendingFramework, setPendingFramework] = useState<FrameworkSelection | null>(null);
    const frameworkMenuRef = useRef<HTMLDivElement | null>(null);

    const [stressLevel, setStressLevel] = useState(50);
    const [actualPomos, setActualPomos] = useState(1);

    useEffect(() => {
        if (!showFrameworkMenu) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (frameworkMenuRef.current && !frameworkMenuRef.current.contains(target)) {
                setShowFrameworkMenu(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [showFrameworkMenu]);

    // Auto-fill actual pomodoros with their estimate when the modal opens
    // Use useLayoutEffect for immediate state sync on modal open
    useLayoutEffect(() => {
        if (draggedToMasteryTask) {
            setStressLevel(50);
            setActualPomos(draggedToMasteryTask.estimatedPomos || 1);
        }
    }, [draggedToMasteryTask]);

    // 4:00 AM Reset Logic
    useEffect(() => {
        if (!isInitialized) return;

        const now = new Date();
        const today4AM = new Date();
        today4AM.setHours(4, 0, 0, 0);

        if (now.getHours() < 4) {
            today4AM.setDate(today4AM.getDate() - 1);
        }

        const lastPlan = lastPlannedDate ? new Date(lastPlannedDate as string) : null;
        const needsPlanning = !lastPlan || isNaN(lastPlan.getTime()) || lastPlan < today4AM;

        if (needsPlanning !== showMorningModal) {
            setShowMorningModal(needsPlanning);
        }
    }, [isInitialized, lastPlannedDate, showMorningModal]);

    // 9:00 PM Nudge Logic
    useEffect(() => {
        // 1. Only schedule ONCE per session - don't recurse
        let timeoutId: ReturnType<typeof setTimeout>;
        let hasNotified = false;

        const scheduleNextNudge = () => {
            const now = new Date();
            const targetTime = new Date(now);

            // Set target to exactly 9:00:00.000 PM
            targetTime.setHours(21, 0, 0, 0);

            // If it is already past 9 PM today, schedule for 9 PM tomorrow
            if (now.getTime() >= targetTime.getTime()) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            const msUntil9PM = targetTime.getTime() - now.getTime();

            timeoutId = setTimeout(() => {
                // Only fire the notification once per session
                if (!hasNotified) {
                    hasNotified = true;
                    triggerChumToast("🌙 Hey! It's 9 PM. Time to Wrap Up the day?", "info");
                }
            }, msUntil9PM);
        };

        // Kick off the first schedule
        scheduleNextNudge();

        // Cleanup on unmount
        return () => clearTimeout(timeoutId);
    }, []);

    const [newTask, setNewTask] = useState<{ title: string, description: string, load: TaskLoad, deadline: string, estimatedPomos?: number }>({ title: "", description: "", load: "medium", deadline: "" });
    const [isScheduled, setIsScheduled] = useState(false);
    
    // Widget visibility toggles
    const [showCurrentFocus, setShowCurrentFocus] = useState(true);
    const [showGarden3D, setShowGarden3D] = useState(true);
    const [showHallOfMastery, setShowHallOfMastery] = useState(true);
    
    // 3D Garden maximize state
    const [isGarden3DMaximized, setIsGarden3DMaximized] = useState(false);

    // Ensure sidebar is hidden when maximized
    useEffect(() => {
        if (isGarden3DMaximized) {
            setSettings({ isSidebarHidden: true });
        } else {
            setSettings({ isSidebarHidden: false });
        }
    }, [isGarden3DMaximized, setSettings]);
    
    // View menu and task load filter state
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [taskLoadFilters, setTaskLoadFilters] = useState<TaskLoad[]>(['light', 'medium', 'heavy']);
    const viewMenuRef = useRef<HTMLDivElement | null>(null);
    
    // Close view menu when clicking outside
    useEffect(() => {
        if (!showViewMenu) return;
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (viewMenuRef.current && !viewMenuRef.current.contains(target)) {
                setShowViewMenu(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [showViewMenu]);
    
    // Helper: Check if at least one widget is visible
    const visibleWidgetCount = [showCurrentFocus, showGarden3D, showHallOfMastery].filter(Boolean).length;
    
    // Helper: Check if a widget is the only one visible
    const isOnlyWidgetVisible = (type: 'focus' | 'garden' | 'mastery') => {
        const visibility = {
            focus: showCurrentFocus,
            garden: showGarden3D,
            mastery: showHallOfMastery
        };
        return visibleWidgetCount === 1 && visibility[type];
    };
    
    // Filter tasks by load type
    const filteredTasksByLoad = activeQuests.filter(t => taskLoadFilters.includes(t.load));
    
    // Helper to filter by both framework AND load type
    const filterByFrameworkAndLoad = (tasks: Task[], filterFn?: (t: Task) => boolean) => {
        let filtered = tasks.filter(t => taskLoadFilters.includes(t.load));
        if (filterFn) filtered = filtered.filter(filterFn);
        return filtered;
    };

    // 👇 ADD THIS BLOCK: Auto-turns on the Scheduled toggle and sets the time to "now" when the modal opens
    useLayoutEffect(() => {
        if (isAdding) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask(prev => ({ ...prev, deadline: now.toISOString().slice(0, 16) }));
            setIsScheduled(true);
        }
    }, [isAdding]);

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find((t: Task) => t.id === event.active.id);
        setActiveDragTask(task || null);
    };
    const handleToggleSchedule = (checked: boolean) => {
        setIsScheduled(checked);
        if (checked && !newTask.deadline) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask({ ...newTask, deadline: now.toISOString().slice(0, 16) });
        } else if (!checked) {
            setNewTask({ ...newTask, deadline: "" });
        }
    };

    const handlePlantQuest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        const heavyCount = activeQuests.filter(t => t.load === 'heavy').length;

        // 1. Burnout Hard Stop
        if (newTask.load === 'heavy' && heavyCount >= 2) {
            triggerChumToast(
                <span><strong className="text-red-400">Burnout Risk Detected! ⚠️</strong><br />You already have {heavyCount} Heavy tasks today. Adding more severely reduces focus. Try breaking this into Medium tasks.</span>,
                'warning'
            );
            return;
        }

        // 2. Soft Limits for 1-3-5 Mode
        if (activeFramework === '1-3-5') {
            const mediumCount = activeQuests.filter(t => t.load === 'medium').length;
            const lightCount = activeQuests.filter(t => t.load === 'light').length;

            if (newTask.load === 'medium' && mediumCount >= 3) {
                triggerChumToast("You're loading up! Usually we keep it to 3 medium tasks in this framework.");
            } else if (newTask.load === 'light' && lightCount >= 5) {
                triggerChumToast("That's a lot of small plants! Try to stay under 5 light tasks.");
            }
        }

        addTask({ ...newTask, deadline: isScheduled ? newTask.deadline : undefined });
        setIsAdding(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: "" });
        setIsScheduled(false);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;
        if (!over) return;

        if (over.id === "hall-of-mastery") {
            const task = tasks.find((t: Task) => t.id === active.id);
            if (task) {
                // Now we ONLY set the task. Confetti and Glide will trigger in the modal's Confirm handler.
                setDraggedToMasteryTask(task);
            }
        } else if (over.id.toString().startsWith('quadrant-')) {
            const quadrant = parseInt(over.id.toString().split('-')[1]);
            updateTask(active.id as string, { eisenhowerQuadrant: quadrant });
        } else if (over.id.toString().startsWith('ivy-')) {
            const rank = parseInt(over.id.toString().split('-')[1]);
            // Advanced: If dragging to an occupied slot, swap them instantly!
            const existingTask = activeQuests.find((t: Task) => t.ivyRank === rank);
            if (existingTask && existingTask.id !== active.id) {
                const currentRank = tasks.find((t: Task) => t.id === active.id)?.ivyRank;
                updateTask(existingTask.id, { ivyRank: currentRank }); // Move old task to new task's old slot
            }
            updateTask(active.id as string, { ivyRank: rank });
        } else if (over.id.toString().startsWith('zone-')) {
            const targetLoad = over.id.toString().replace('zone-', '') as TaskLoad;
            const currentTask = tasks.find((t: Task) => t.id === active.id);
            if (currentTask?.load !== targetLoad) {
                // Check limits for 1-3-5
                const currentCount = activeQuests.filter((t: Task) => t.load === targetLoad).length;
                if (targetLoad === 'heavy' && currentCount >= 1) {
                    triggerChumToast("⚠️ 1-3-5 Rule: Only 1 Heavy quest allowed! Crush the current one before adding another.", 'warning');
                    return; // Abort the drop!
                }
                if (targetLoad === 'medium' && currentCount >= 3) {
                    triggerChumToast("Careful! 1-3-5 Rule suggests a max of 3 Medium quests. Don't burn out!");
                }
                if (targetLoad === 'light' && currentCount >= 5) {
                    triggerChumToast("That's a lot of little tasks! 1-3-5 Rule caps at 5 Light quests.");
                }
                updateTask(active.id as string, { load: targetLoad }); // Change the cognitive load
            }
        } else if (over.id === "seed-bank") {
            // Remove from any matrix/list and send to unsorted
            updateTask(active.id as string, { eisenhowerQuadrant: undefined, ivyRank: undefined });
        }
    };

    const { isOver: isGeodeOver, setNodeRef: setGeodeRef } = useDroppable({ id: "geode-dropzone" });

    // ─── NEW: Terrarium Drop Zone & Filter State ───
    // const [activeFilter, setActiveFilter] = useState<'default' | 'dark' | 'refreshing' | 'cool'>('default'); // Unused

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Full-height container, responsive scroll logic */}
            <div id="garden-main-zone" className={`flex flex-col h-full p-6 lg:p-8 bg-[var(--bg-dark)] overflow-hidden relative ${isGarden3DMaximized ? 'hidden' : ''}`}>

                <AnimatePresence>
                    {showMorningModal && <MorningPlanningModal />}
                    {showUnDoneModal && <UnDoneModal onClose={() => setShowUnDoneModal(false)} />}

                    {/* Plant Quest Modal */}
                    {isAdding && (
                        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.form
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onSubmit={handlePlantQuest} className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-2xl flex flex-col"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-[var(--text-main)]">{isGamified ? "Seed a New Quest" : "Create New Task"}</h3>
                                    <button type="button" onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-4">
                                        <input autoFocus type="text" required placeholder={isGamified ? "Quest Title" : "Task Title"} value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        <textarea placeholder="Description..." rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] resize-none" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3">
                                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">{terms.taskLoad}</label>
                                            <div className="flex gap-2">
                                                {['light', 'medium', 'heavy'].map((weight) => (
                                                    <button key={weight} type="button" onClick={() => setNewTask({ ...newTask, load: weight as TaskLoad })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${newTask.load === weight ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>{weight}</button>
                                                ))}
                                            </div>
                                            {isPremiumUser && (
                                                <div className="bg-[var(--bg-dark)] border border-[var(--accent-yellow)]/30 rounded-xl p-3 mt-4 shadow-[inset_0_0_15px_rgba(250,204,21,0.05)]">
                                                    <label className="text-xs font-bold text-[var(--accent-yellow)] uppercase mb-2 flex items-center gap-1.5">
                                                        <Sparkles size={12} /> Estimated {terms.pomodoro}s
                                                    </label>
                                                    <input
                                                        type="number" min="1" max="20" placeholder="e.g. 2"
                                                        value={newTask.estimatedPomos || ''}
                                                        onChange={e => setNewTask({ ...newTask, estimatedPomos: parseInt(e.target.value) || 1 })}
                                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-yellow)]"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2 transition-all">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase block">{isGamified ? "Best Before (Deadline)" : "Deadline"}</label>
                                                <div onClick={() => handleToggleSchedule(!isScheduled)} className="flex items-center gap-2 cursor-pointer group">
                                                    <span className={`text-xs font-bold transition-colors ${isScheduled ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>
                                                        {isScheduled ? 'Scheduled' : 'Unscheduled'}
                                                    </span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${isScheduled ? 'bg-[var(--accent-teal)]' : 'bg-[var(--bg-sidebar)] border border-[var(--border-color)]'}`}>
                                                        <div className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${isScheduled ? 'translate-x-4 bg-[#0b1211]' : 'translate-x-0 bg-[var(--text-muted)]'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {isScheduled && (
                                                    <motion.input
                                                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                        type="datetime-local" required value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                                        className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] mt-1"
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                                    <SquishyButton type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-none shadow-none">Cancel</SquishyButton>
                                    <SquishyButton type="submit" className="bg-[var(--accent-teal)] text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold hover:bg-teal-400 transition-colors disabled:opacity-50" disabled={!newTask.title.trim()}>{isGamified ? "Plant Seed" : "Create Task"}</SquishyButton>
                                </div>
                            </motion.form>
                        </div>
                    )}
                    {/* 🔥 THE MASTERY CONFIRMATION MODAL 🔥 */}
                    {draggedToMasteryTask && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDraggedToMasteryTask(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border-2 border-[var(--text-muted)] rounded-2xl p-8 w-full max-w-sm text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
                                <h3 className="text-xl font-black text-white mb-2">Archive Quest?</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-6">Mark <span className="text-white font-bold">&quot;{draggedToMasteryTask.title}&quot;</span> as completed and move it to the Hall of Mastery.</p>

                                {/* 🔥 PREMIUM POST-MATCH SURVEY 🔥 */}
                                {isPremiumUser && (
                                    <div className="mb-6 space-y-4 text-left bg-black/40 p-4 rounded-xl border border-[var(--accent-yellow)]/20 shadow-[inset_0_0_20px_rgba(250,204,21,0.05)]">
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <BrainCircuit size={12} /> Stress Level: {stressLevel}
                                            </label>
                                            <input
                                                type="range" min="0" max="100" value={stressLevel} onChange={e => setStressLevel(parseInt(e.target.value))}
                                                className="w-full accent-[var(--accent-yellow)]"
                                            />
                                            <div className="flex justify-between text-[9px] text-white/40 mt-1 uppercase font-bold tracking-widest">
                                                <span>Flow (0)</span><span>Burnout (100)</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <Clock size={12} /> Actual Pomodoros
                                            </label>
                                            <input
                                                type="number" min="1" value={actualPomos} onChange={e => setActualPomos(parseInt(e.target.value) || 1)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-yellow)]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <SquishyButton onClick={() => setDraggedToMasteryTask(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-sm font-bold transition-all shadow-none">Cancel</SquishyButton>
                                    <SquishyButton
                                        onClick={async () => {
                                            const task = draggedToMasteryTask!;
                                            const completedIvyRank = task.ivyRank;

                                            // 1. Lift stage
                                            setAnimatingTaskId(task.id);
                                            setDraggedToMasteryTask(null);

                                            // 2. Wait for lift, then Glide (trigger by completion)
                                            setTimeout(async () => {
                                                // Switch to tasks tab so destination is visible
                                                setMasteryTab('tasks');
                                                
                                                // Actual move
                                                completeTask(task.id, isPremiumUser ? { actualPomos, stressLevel } : undefined);
                                                
                                                if (activeFramework === 'ivy' && completedIvyRank) {
                                                    activeQuests.forEach(t => {
                                                        if (t.ivyRank && t.ivyRank > completedIvyRank && t.id !== task.id) {
                                                            updateTask(t.id, { ivyRank: t.ivyRank - 1 });
                                                        }
                                                    });
                                                }

                                                // End lift animation state
                                                setAnimatingTaskId(null);

                                                // 3. Landing & Bloom stage (happens after glide)
                                                setTimeout(() => {
                                                    setRecentlyCompletedTaskId(task.id);
                                                    playChime();
                                                    
                                                    confetti({
                                                        particleCount: 100,
                                                        spread: 70,
                                                        origin: { x: 0.85, y: 0.5 }, // Originating near the mastery column
                                                        colors: ['#2dd4bf', '#facc15', '#ff007f', '#8b5cf6'],
                                                        zIndex: 100000
                                                    });

                                                    triggerChumToast(task.isFrog ? "🐸 FROG CRUSHED! Momentum surge detected!" : "Quest mastered!", "success");

                                                    // Clear bloom effect
                                                    setTimeout(() => setRecentlyCompletedTaskId(null), 1500);
                                                }, 800); // Wait for glide to finish
                                            }, 600); // Lift duration
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-white text-black hover:brightness-90 text-sm font-black transition-all shadow-lg"
                                    >
                                        Archive Quest
                                    </SquishyButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                    {/* 🔥 FRAMEWORK SWITCH CONFIRMATION MODAL 🔥 */}
                    {pendingFramework !== null && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingFramework(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl relative z-10">
                                <h3 className="text-xl font-black text-white mb-2">Switch Framework?</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8">
                                    Are you sure you want to switch to the <span className="text-[var(--accent-teal)] font-bold">
                                        {/* 👇 Added the same name-formatting logic here! */}
                                        {pendingFramework === 'standard' ? 'Standard List' :
                                            pendingFramework === 'ivy' ? 'Ivy Lee Method' :
                                                pendingFramework === 'eisenhower' ? 'Eisenhower Matrix' :
                                                    pendingFramework === '1-3-5' ? '1-3-5 Method' : pendingFramework}
                                    </span>? This will change how your current quests are organized.
                                </p>
                                <div className="flex gap-3">
                                    <SquishyButton onClick={() => setPendingFramework(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-sm font-bold transition-all shadow-none">Cancel</SquishyButton>
                                    <SquishyButton onClick={() => {
                                        const nextFramework = pendingFramework === 'standard' ? null : pendingFramework;
                                        setActiveFramework(nextFramework as typeof activeFramework);
                                        setPendingFramework(null);
                                    }} className="flex-1 py-3 rounded-xl bg-[var(--accent-teal)] text-black hover:brightness-110 text-sm font-black transition-all shadow-lg">Confirm</SquishyButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Header Section */}
                {/* STYLING FIX: Added relative z-[100] to ensure dropdowns overlap the 3D canvas! */}
                <header className="mb-6 shrink-0 relative z-[100] flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                            <Sprout className="text-[var(--accent-teal)]" size={32} /> {terms.crystalGarden}
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest mt-2">{isGamified ? "Cultivate and manage your active quests." : "Cultivate and manage your active tasks."}</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto flex-wrap pb-2 md:pb-0 hide-scrollbar shrink-0">
                        <div className="relative flex-1 md:w-48 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                            />
                        </div>
                        
                        {/* 👁️ VIEW & FILTER MENU */}
                        <div ref={viewMenuRef} className="relative z-50">
                            <SquishyButton
                                onClick={() => setShowViewMenu(!showViewMenu)}
                                className="h-full px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent-teal)] shadow-none"
                            >
                                <Eye size={16} />
                                <ChevronDown size={14} className={`transition-transform duration-300 ${showViewMenu ? 'rotate-180' : ''}`} />
                            </SquishyButton>
                            <AnimatePresence>
                                {showViewMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        {/* Widget Visibility Controls */}
                                        <div className="p-4 border-b border-[var(--border-color)]">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Widgets</p>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => setShowCurrentFocus(!showCurrentFocus)}
                                                    disabled={isOnlyWidgetVisible('focus')}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-bold ${
                                                        showCurrentFocus
                                                            ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]'
                                                            : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-white disabled:opacity-50'
                                                    } ${isOnlyWidgetVisible('focus') ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    {showCurrentFocus ? '✓' : ''} Current Focus
                                                </button>
                                                <button
                                                    onClick={() => setShowGarden3D(!showGarden3D)}
                                                    disabled={isOnlyWidgetVisible('garden')}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-bold ${
                                                        showGarden3D
                                                            ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]'
                                                            : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-white disabled:opacity-50'
                                                    } ${isOnlyWidgetVisible('garden') ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    {showGarden3D ? '✓' : ''} 3D Garden
                                                </button>
                                                <button
                                                    onClick={() => setShowHallOfMastery(!showHallOfMastery)}
                                                    disabled={isOnlyWidgetVisible('mastery')}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-bold ${
                                                        showHallOfMastery
                                                            ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]'
                                                            : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-white disabled:opacity-50'
                                                    } ${isOnlyWidgetVisible('mastery') ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    {showHallOfMastery ? '✓' : ''} Hall of Mastery
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Task Load Filters */}
                                        <div className="p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Task Load Filter</p>
                                            <div className="space-y-2">
                                                {(['light', 'medium', 'heavy'] as const).map((load) => (
                                                    <button
                                                        key={load}
                                                        onClick={() => {
                                                            setTaskLoadFilters(prev =>
                                                                prev.includes(load)
                                                                    ? prev.filter(l => l !== load)
                                                                    : [...prev, load]
                                                            );
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-bold capitalize ${
                                                            taskLoadFilters.includes(load)
                                                                ? load === 'light' ? 'bg-teal-400/20 border-teal-400 text-teal-400' :
                                                                  load === 'medium' ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' :
                                                                  'bg-red-400/20 border-red-400 text-red-400'
                                                                : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:text-white'
                                                        }`}
                                                    >
                                                        {taskLoadFilters.includes(load) ? '✓' : ''} {load}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* 🔥 THE FRAMEWORK DROPDOWN 🔥 */}
                        <div ref={frameworkMenuRef} className="relative z-50">
                            <SquishyButton
                                onClick={() => setShowFrameworkMenu(!showFrameworkMenu)}
                                className={`h-full px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all capitalize shadow-none ${activeFramework
                                    ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/50 text-[var(--accent-teal)]'
                                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent-teal)]'
                                    }`}
                            >
                                {activeFramework
                                    ? `${terms.framework}: ${activeFramework === 'ivy'
                                        ? 'Ivy Lee Method'
                                        : activeFramework === 'eisenhower'
                                            ? 'Eisenhower Matrix'
                                            : activeFramework === '1-3-5'
                                                ? '1-3-5 Method'
                                                : activeFramework
                                    }`
                                    : `Standard ${terms.shards}`}
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-300 ${showFrameworkMenu ? 'rotate-180' : ''
                                        }`}
                                />
                            </SquishyButton>
                            <AnimatePresence>
                                {showFrameworkMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        {(
                                            [
                                                { id: null, label: 'Standard List' },
                                                { id: '1-3-5', label: '1-3-5 Method' },
                                                { id: 'eisenhower', label: 'Eisenhower Matrix' },
                                                { id: 'ivy', label: 'Ivy Lee Method' },
                                            ] as { id: 'eisenhower' | '1-3-5' | 'ivy' | null; label: string }[]
                                        ).map((fw) => {
                                            const isActive = activeFramework === fw.id;
                                            const selection = fw.id ?? 'standard';
                                            return (
                                            <SquishyButton
                                                key={fw.label}
                                                onClick={() => {
                                                    setShowFrameworkMenu(false);
                                                    if (activeFramework !== fw.id) setPendingFramework(selection);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors border-none shadow-none rounded-none ${
                                                    isActive
                                                        ? 'bg-[var(--bg-sidebar)] text-[var(--text-main)]'
                                                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-main)]'
                                                }`}
                                                aria-current={isActive ? 'true' : undefined}
                                            >
                                                <span className="flex items-center justify-between w-full">
                                                    <span>{fw.label}</span>
                                                    {isActive && <Check size={14} className="text-[var(--accent-teal)]" />}
                                                </span>
                                            </SquishyButton>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <SquishyButton onClick={() => setShowUnDoneModal(true)} className="bg-[var(--bg-sidebar)] border border-(--border-color) px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-main)] hover:text-[var(--accent-teal)] hover:border-[var(--accent-teal)] transition-colors flex items-center justify-center whitespace-nowrap gap-2 shrink-0">
                            <Moon size={16} /> Wrap Up
                        </SquishyButton>
                        <SquishyButton id="garden-add-task-btn" onClick={() => setIsAdding(true)} className="bg-[var(--accent-teal)] text-[#0b1211] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-[0_0_10px_rgba(20,184,166,0.2)] shrink-0">
                            <Plus size={16} /> Plant Quest
                        </SquishyButton>
                    </div>
                </header>

                <ConfirmationModal
                    isOpen={showBulkDeleteConfirm}
                    title="Release All Selected?"
                    message={`Are you sure you want to release ${selectedTaskIds.length} quests? This action cannot be undone.`}
                    confirmText="Release All"
                    cancelText="Keep Quests"
                    isDangerous={true}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setShowBulkDeleteConfirm(false)}
                />
                
                {/* 3. The Strict 3-Column Layout! (Responsive stack on mobile) */}
                <div className={`flex-1 grid gap-6 min-h-0 overflow-y-auto lg:overflow-hidden no-scrollbar ${
                    showCurrentFocus && showGarden3D && showHallOfMastery ? 'grid-cols-1 lg:grid-cols-3' :
                    (showCurrentFocus && showGarden3D) || (showCurrentFocus && showHallOfMastery) || (showGarden3D && showHallOfMastery) ? 'grid-cols-1 lg:grid-cols-2' :
                    'grid-cols-1'
                }`}>

                    {/* LEFT Column: Active Quests (Cinematic Shape-Shifter) */}
                    <AnimatePresence>
                        {showCurrentFocus && (
                            <motion.section
                                id="garden-framework-zone"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="h-[420px] lg:h-full flex flex-col shrink-0"
                            >
                                <div id="garden-active-quests" className="bg-[var(--bg-card)] border border-(--border-color) rounded-2xl p-4 sm:p-5 flex flex-col h-full overflow-hidden shadow-sm">

                            {/* Static Header */}
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-[var(--text-main)]">Current Focus</h2>
                                </div>
                                <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
                                    {activeFramework === 'eisenhower' ? terms.eisenhowerQuadrant : activeFramework === '1-3-5' ? '1-3-5 Protocol' : activeFramework === 'ivy' ? terms.ivyRank : `Standard ${terms.shards}`}
                                </span>
                            </div>

                            <AnimatePresence>
                                {showProtocolSettings && activeFramework === '1-3-5' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl p-4 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-teal)]">Protocol Limits</h4>
                                            <button onClick={() => setShowProtocolSettings(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={14} /></button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['heavy', 'medium', 'light'] as const).map(l => (
                                                <div key={l} className="space-y-1.5 text-center">
                                                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{l}</p>
                                                    <input
                                                        type="number" min="1" max="9"
                                                        value={protocolLimits[l]}
                                                        onChange={(e) => updateProtocolLimits({ [l]: parseInt(e.target.value) || 1 })}
                                                        className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl py-1 text-center text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Dynamic Morphing Arena */}
                            <div className="flex-1 relative min-h-0">
                                <AnimatePresence mode="wait">

                                    {activeFramework === 'eisenhower' ? (
                                        <motion.div
                                            key="eisenhower"
                                            initial={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, scale: 1.05, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="absolute inset-0 flex flex-col gap-4"
                                        >
                                            <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
                                                <MatrixZone id="quadrant-1" title="Do First" subtitle={`${terms.urgency} & ${terms.importance}`} tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => t.eisenhowerQuadrant === 1)} color="text-red-400" bg="bg-red-400/5" border="border-red-400/30" activeBorder="border-red-400" onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                                <MatrixZone id="quadrant-2" title="Schedule" subtitle={`Not ${terms.urgency}, ${terms.importance}`} tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => t.eisenhowerQuadrant === 2)} color="text-[var(--accent-teal)]" bg="bg-[var(--accent-teal)]/5" border="border-[var(--accent-teal)]/30" activeBorder="border-[var(--accent-teal)]" onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                                <MatrixZone id="quadrant-3" title="Delegate" subtitle={`${terms.urgency}, Not ${terms.importance}`} tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => t.eisenhowerQuadrant === 3)} color="text-[var(--accent-yellow)]" bg="bg-[var(--accent-yellow)]/5" border="border-[var(--accent-yellow)]/30" activeBorder="border-[var(--accent-yellow)]" onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                                <MatrixZone id="quadrant-4" title="Don't Do" subtitle={`Not ${terms.urgency}, Not ${terms.importance}`} tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => t.eisenhowerQuadrant === 4)} color="text-[var(--text-muted)]" bg="bg-[var(--bg-dark)]" border="border-[var(--border-color)]" activeBorder="border-[var(--text-muted)]" onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                            </div>
                                            {filterByFrameworkAndLoad(activeQuests, (t: Task) => !t.eisenhowerQuadrant).length > 0 && (
                                                <div className="h-[30%] min-h-[160px] shrink-0">
                                                    <UnsortedZone id="seed-bank" tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => !t.eisenhowerQuadrant)} title="Unsorted Quests (Drag to Quadrant)" onViewAll={() => setShowUnrankedModal(true)} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                                </div>
                                            )}
                                        </motion.div>

                                    ) : activeFramework === '1-3-5' ? (
                                        <motion.div
                                            key="135"
                                            initial={{ opacity: 0, x: -30, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, x: 30, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            className="absolute inset-0 flex flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1 pb-1"
                                        >
                                            {/* ✅ Using the new interactive dropdown slots! */}
                                            <DropdownCapacityZone loadType="heavy" title="1 Heavy Quest" max={1} allTasks={filteredTasksByLoad} color="text-red-400" bg="bg-red-400/5" border="border-red-400/30" updateTask={updateTask} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                            <DropdownCapacityZone loadType="medium" title="3 Medium Quests" max={3} allTasks={filteredTasksByLoad} color="text-[var(--accent-yellow)]" bg="bg-[var(--accent-yellow)]/5" border="border-[var(--accent-yellow)]/30" updateTask={updateTask} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                            <DropdownCapacityZone loadType="light" title="5 Light Quests" max={5} allTasks={filteredTasksByLoad} color="text-[var(--accent-teal)]" bg="bg-[var(--accent-teal)]/5" border="border-[var(--accent-teal)]/30" updateTask={updateTask} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                        </motion.div>

                                    ) : activeFramework === 'ivy' ? (
                                        <motion.div
                                            key="ivy"
                                            initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, y: -30, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                            className="absolute inset-0 flex flex-col gap-4 overflow-hidden"
                                        >
                                            {/* 🔥 PADDED SCROLL CONTAINER: px-1 and -mx-1 gives the glow room to breathe! */}
                                            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden flex flex-col gap-3 pb-6 px-1 -mx-1">
                                                {[1, 2, 3, 4, 5, 6].map(rank => {
                                                    const task = filteredTasksByLoad.find(t => t.ivyRank === rank);
                                                    const activeRank = [1, 2, 3, 4, 5, 6].find(r => {
                                                        const t = filteredTasksByLoad.find(t => t.ivyRank === r);
                                                        return !t || !t.isCompleted;
                                                    }) || 1;
                                                    const isLocked = !!(task && rank > activeRank);

                                                    return <IvySlot key={rank} rank={rank} task={task || null} isLocked={isLocked} isActive={rank === activeRank} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />;
                                                })}
                                            </div>
                                            {filterByFrameworkAndLoad(activeQuests, (t: Task) => !t.ivyRank).length > 0 && (
                                                <div className="h-1/3 min-h-[150px] shrink-0">
                                                    <UnsortedZone id="seed-bank" tasks={filterByFrameworkAndLoad(activeQuests, (t: Task) => !t.ivyRank)} title="Unranked Quests (Drag to Rank)" onViewAll={() => setShowUnrankedModal(true)} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="standard"
                                            initial={{ opacity: 0, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3 }}
                                            className="absolute inset-0 flex flex-col p-1"
                                        >
                                            <StandardZone id="current-focus" tasks={sortedQuests.filter(t => taskLoadFilters.includes(t.load))} onToggleSelect={handleToggleSelect} selectedIds={selectedTaskIds} animatingTaskId={animatingTaskId} recentlyCompletedTaskId={recentlyCompletedTaskId} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                            </motion.section>
                        )}
                    </AnimatePresence>

                    {/* MIDDLE Column: The Terrarium Drop Zone */}
                    <AnimatePresence>
                        {showGarden3D && (
                            <motion.div
                                id="garden-crystal-visual"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="h-[400px] lg:h-full relative flex flex-col pt-0 shrink-0"
                            >
                        <div ref={setGeodeRef} className={`flex-1 relative rounded-2xl md:rounded-[2.5rem] p-0.5 md:p-1 transition-colors duration-300 ${isGeodeOver ? 'bg-[var(--accent-teal)] shadow-[0_0_30px_rgba(20,184,166,0.3)]' : 'bg-[#111] shadow-[inset_0_4px_20px_rgba(0,0,0,0.6),0_0_0_1px_var(--border-color)]'}`}>
                            <div className={`w-full h-full rounded-xl md:rounded-[1.8rem] overflow-hidden relative shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] transition-all ${isGeodeOver ? 'border-2 border-[var(--bg-dark)]' : 'border border-white/10'}`}>
                                <div className="absolute top-5 left-5 z-10 pointer-events-none">
                                    <h2 className="text-xl font-black text-white drop-shadow-lg tracking-wide">Daily Synthesization</h2>
                                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest mt-1 drop-shadow-md">
                                        {completionRatio >= 1 ? "Protocol Fulfilled" : "Synthesizing Momentum"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsGarden3DMaximized(!isGarden3DMaximized)}
                                    className="absolute top-5 right-5 z-10 p-2 rounded-lg bg-[var(--bg-dark)]/80 hover:bg-[var(--bg-dark)] text-white/70 hover:text-white transition-all"
                                    title={isGarden3DMaximized ? "Minimize" : "Maximize"}
                                >
                                    {isGarden3DMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                {crystalGrowth >= 100 && (
                                    <div className="absolute bottom-5 right-5 z-10">
                                        <button
                                            onClick={() => setIsCrystalMasteryOpen(true)}
                                            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--accent-yellow)] text-black shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:brightness-110 transition-all"
                                        >
                                            Rebirth Crystal
                                        </button>
                                    </div>
                                )}
                                <GeodeScene
                                    completionRatio={completionRatio}
                                    snipingShard={snipingShard}
                                    setSnipingShard={setSnipingShard}
                                    isRebirthing={isRebirthing}
                                />
                            </div>
                        </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RIGHT Column: Hall of Mastery */}
                    <AnimatePresence>
                        {showHallOfMastery && (
                            <motion.section
                                id="garden-mastery-col"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="h-[500px] lg:h-full overflow-hidden flex flex-col"
                            >
                        <MasteryContainer
                            id="hall-of-mastery"
                            masteryTab={masteryTab}
                            setMasteryTab={setMasteryTab}
                            isEmpty={
                                masteryTab === 'tasks' ? archivedQuests.length === 0
                                    : masteryTab === 'shards' ? masteredShards.length === 0
                                        : masteredCrystals.length === 0
                            }
                            emptyText={
                                masteryTab === 'tasks' ? "No archived quests yet"
                                    : masteryTab === 'shards' ? "No knowledge shards have reached 100% mastery yet."
                                        : "No perfected crystals yet."
                            }
                        >
                            {masteryTab === 'tasks' ? (
                                archivedQuests.map((task: Task) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onToggleSelect={handleToggleSelect} 
                                        selected={selectedTaskIds.includes(task.id)} 
                                        layoutId={task.id}
                                        isRecentlyCompleted={recentlyCompletedTaskId === task.id}
                                    />
                                ))
                            ) : masteryTab === 'shards' ? (
                                masteredShards.map((shard: Shard) => (
                                    <MasteredShardCard
                                        key={shard.id}
                                        shard={shard}
                                        onSnipe={() => setSnipingShard(shard)}
                                    />
                                ))
                            ) : (
                                masteredCrystals.map((crystal: any) => (
                                    <MasteredCrystalCard
                                        key={crystal.id}
                                        name={crystal.crystal_name}
                                        masteredAt={crystal.mastered_at}
                                    />
                                ))
                            )}
                        </MasteryContainer>
                    </motion.section>
                        )}
                    </AnimatePresence>

                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

                {/* 🔥 UNRANKED QUESTS MODAL 🔥 */}
                <AnimatePresence>
                    {showUnrankedModal && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUnrankedModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[2.5rem] p-8 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative z-10 overflow-hidden">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[var(--accent-teal)]/10 rounded-2xl flex items-center justify-center border border-[var(--accent-teal)]/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
                                            <Maximize2 size={24} className="text-[var(--accent-teal)]" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest">Unsorted Quests</h3>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Awaiting Command Initialized ({filteredTasksByLoad.filter((t: Task) => activeFramework === 'eisenhower' ? !t.eisenhowerQuadrant : !t.ivyRank).length})</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowUnrankedModal(false)} className="bg-[var(--bg-dark)] border border-[var(--border-color)] p-3 rounded-2xl text-[var(--text-muted)] hover:text-white transition-all hover:scale-110 active:scale-95"><X size={20} /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                    {filteredTasksByLoad.filter((t: Task) => activeFramework === 'eisenhower' ? !t.eisenhowerQuadrant : !t.ivyRank).map(task => (
                                        <TaskCard key={task.id} task={task} completionEffect="glide" layoutId={task.id} isRecentlyCompleted={recentlyCompletedTaskId === task.id} />
                                    ))}
                                    {filteredTasksByLoad.filter((t: Task) => activeFramework === 'eisenhower' ? !t.eisenhowerQuadrant : !t.ivyRank).length === 0 && (
                                        <div className="col-span-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-4 py-20 opacity-50">
                                            <Sprout size={48} />
                                            <p className="text-sm font-bold uppercase tracking-widest">No unranked quests found</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* BULK ACTION BAR */}
                <AnimatePresence>
                    {selectedTaskIds.length > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border-2 border-[var(--accent-teal)] rounded-2xl px-6 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-6 z-[1000] backdrop-blur-md"
                        >
                            <div className="flex items-center gap-3 pr-6 border-r border-[var(--border-color)]">
                                <span className="bg-[var(--accent-teal)] text-black text-xs font-black px-2 py-1 rounded-md">
                                    {selectedTaskIds.length}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Quests Selected</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <SquishyButton
                                    onClick={handleBulkComplete}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--accent-teal)] transition-all shadow-lg border-none"
                                >
                                    <CheckCircle2 size={14} /> Complete
                                </SquishyButton>
                                <SquishyButton
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-none"
                                >
                                    <X size={14} /> Delete
                                </SquishyButton>
                                <SquishyButton
                                    onClick={() => setSelectedTaskIds([])}
                                    className="text-xs font-bold text-[var(--text-muted)] hover:text-white transition-colors ml-2 border-none bg-transparent shadow-none p-1"
                                >
                                    Cancel
                                </SquishyButton>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isCrystalMasteryOpen && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCrystalMasteryOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-[var(--bg-card)] border-2 border-[var(--accent-yellow)] rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl relative z-10"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent-yellow)]/15 border border-[var(--accent-yellow)]/30 flex items-center justify-center">
                                        <Sparkles size={22} className="text-[var(--accent-yellow)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Crystal Mastery Reached</h3>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Name your perfected crystal</p>
                                    </div>
                                </div>

                                <input
                                    value={crystalNameInput}
                                    onChange={(e) => setCrystalNameInput(e.target.value)}
                                    placeholder="Crystal name"
                                    className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-[var(--accent-yellow)]"
                                />

                                <div className="mt-6 flex items-center gap-3">
                                    <SquishyButton
                                        onClick={() => setIsCrystalMasteryOpen(false)}
                                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-bold hover:bg-white/5 transition-all shadow-none"
                                    >
                                        Later
                                    </SquishyButton>
                                    <SquishyButton
                                        onClick={async () => {
                                            const trimmed = crystalNameInput.trim();
                                            if (!trimmed) return;
                                            
                                            setIsRebirthing(true);
                                            // Give it 800ms to shrink in 3D
                                            await new Promise(r => setTimeout(r, 800));
                                            
                                            await rebirthCrystal(trimmed);
                                            setIsRebirthing(false);
                                            setIsCrystalMasteryOpen(false);
                                            setCrystalNameInput('');
                                            
                                            playChime(); // Celebrate rebirth!
                                            
                                            // Massive full-screen burst
                                            confetti({
                                                particleCount: 150,
                                                spread: 160,
                                                origin: { x: 0.5, y: 0.5 },
                                                colors: ['#8b5cf6', '#06b6d4', '#f43f5e', '#eab308'],
                                                gravity: 0.8,
                                                scalar: 1.2,
                                                zIndex: 100000
                                            });
                                        }}
                                        disabled={!crystalNameInput.trim()}
                                        className="flex-1 py-3 rounded-xl bg-[var(--accent-yellow)] text-black text-sm font-black uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Ascend Crystal
                                    </SquishyButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={showBulkDeleteConfirm}
                    title="Release All Selected?"
                    message={`Are you sure you want to release ${selectedTaskIds.length} quests? This action cannot be undone.`}
                    confirmText="Release All"
                    cancelText="Keep Quests"
                    isDangerous={true}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setShowBulkDeleteConfirm(false)}
                />
            </div>

            {/* Maximized 3D Garden View (OUTSIDE main zone to prevent display:none issues) */}
            <AnimatePresence>
                {isGarden3DMaximized && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 w-full h-full z-[100000] bg-[#0b1211] flex items-center justify-center overflow-hidden"
                    >
                        <button
                            onClick={() => setIsGarden3DMaximized(false)}
                            className="absolute top-6 right-6 z-[100001] p-3 rounded-lg bg-[var(--bg-dark)]/80 hover:bg-[var(--bg-dark)] text-white/70 hover:text-white transition-all"
                            title="Exit maximize"
                        >
                            <Minimize2 size={24} />
                        </button>
                        <div className="absolute top-5 left-5 z-10 pointer-events-none">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Daily Synthesization</h4>
                            <h2 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-2xl">
                                {completionRatio >= 1 ? "Protocol Fulfilled" : "Synthesizing Momentum"}
                            </h2>
                        </div>
                        {crystalGrowth >= 100 && (
                            <div className="absolute bottom-10 right-10 z-10 flex flex-col items-end gap-3">
                                <div className="text-[10px] font-black text-[var(--accent-yellow)] uppercase tracking-[0.3em] bg-[var(--accent-yellow)]/10 px-3 py-1 rounded-full border border-[var(--accent-yellow)]/20 animate-pulse">Evolution Ready</div>
                                <button
                                    onClick={() => setIsCrystalMasteryOpen(true)}
                                    className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] bg-[var(--accent-yellow)] text-black shadow-[0_0_50px_rgba(234,179,8,0.4)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Rebirth Crystal
                                </button>
                            </div>
                        )}
                        <div ref={setGeodeRef} className="absolute inset-0 w-full h-full pointer-events-auto">
                            <GeodeScene
                                completionRatio={completionRatio}
                                snipingShard={snipingShard}
                                setSnipingShard={setSnipingShard}
                                isRebirthing={isRebirthing}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DndContext>
    );
}
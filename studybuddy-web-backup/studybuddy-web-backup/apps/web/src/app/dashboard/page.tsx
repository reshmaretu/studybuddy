"use client";

import { Brain, Play, Pause, Settings, Bell, Flame, Coffee, Zap, RotateCcw, Calendar, CheckCircle2, Pin, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useStudyStore, Task, calculateXpRequirement, getTitleForLevel } from "@/store/useStudyStore";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "@/components/TaskCard";
import { useRouter } from "next/navigation";
import ChumRenderer from "@/components/ChumRenderer";
import BrainResetModal from "@/components/BrainResetModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useTerms } from "@/hooks/useTerms";
import { useGlowEffect, useGlitterEffect } from "@/hooks/useGlowEffect";
import { GlitterEffect } from "@/components/GlitterEffect";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { SyntheticFeed } from "@studybuddy/ui";
import { SquishyButton } from "@studybuddy/ui";
import confetti from 'canvas-confetti';
import { playChime } from "@/lib/sound";
import { playTick } from "@/lib/sound";

// The Magical Drop Zone Component
function CompletionDropZone() {
    const { isOver, setNodeRef } = useDroppable({ id: "completion-zone" });

    return (
        <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            ref={setNodeRef}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-96 h-32 rounded-3xl border-4 border-dashed flex flex-col items-center justify-center z-50 transition-all duration-300 backdrop-blur-md shadow-2xl ${isOver
                ? "bg-[var(--accent-teal)]/30 border-[var(--accent-teal)] scale-110 drop-shadow-[0_0_20px_var(--accent-teal)] text-[var(--text-main)]"
                : "bg-[var(--bg-dark)]/80 border-[var(--text-muted)] text-[var(--text-muted)]"
                }`}
        >
            <CheckCircle2 size={36} className={`mb-2 ${isOver ? "text-[var(--accent-teal)] animate-bounce" : ""}`} />
            <span className="text-lg font-bold tracking-widest uppercase">
                {isOver ? "Release to Bloom!" : "Gently Nurture Here"}
            </span>
        </motion.div>
    );
}

export default function Dashboard() {
    const [time, setTime] = useState(new Date());
    const router = useRouter();

    // THE FIX: We exclusively use activeDragTask now!
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });

    const {
        tasks, focusScore, dailyStreak, totalSessions, totalSecondsTracked,
        timeLeft, isRunning, toggleTimer, resetTimer, decrementTimer, completeTask, deleteTask,
        isInitialized, xp, level, pomodoroFocus, isBrainResetOpen, setIsBrainResetOpen, lastResetHighlightAt,
        notifications, setIsNotificationCenterOpen, addNotification, triggerChumToast, activeFramework,
        requireCompletionConfirmation = true
    } = useStudyStore();
    const { terms } = useTerms();

    // Page visibility and glow effects
    const isPageVisible = usePageVisibility();
    const focusGlowing = useGlowEffect(focusScore, 500);
    const xpGlowing = useGlowEffect(xp, 500);
    const focusGlitter = useGlitterEffect(focusScore, 500);
    const xpGlitter = useGlitterEffect(xp, 500);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState<null | 'complete' | 'delete'>(null);
    const onToggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkComplete = () => {
        if (selectedIds.length === 0) return;
        setBulkAction('complete');
    };

    const runBulkComplete = async () => {
        for (const id of selectedIds) {
            await completeTask(id);
        }
        setSelectedIds([]);
        triggerChumToast("Bulk calibration complete.", "success");
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setBulkAction('delete');
    };

    const runBulkDelete = async () => {
        for (const id of selectedIds) {
            await deleteTask(id);
        }
        setSelectedIds([]);
        triggerChumToast("Quests released.", "info");
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Safety filter to ensure we only try to render valid tasks
    const validTasks = tasks.filter(t => t && t.id);
    const activeTasks = validTasks.filter(t => !t.isCompleted);
    const completedTasks = validTasks.filter(t => t.isCompleted);
    const showFourthTask = activeTasks.length === 4;
    const showGardenShortcut = activeTasks.length >= 5;
    const hiddenTaskCount = Math.max(0, activeTasks.length - 4);

    const [sparkQuote, setSparkQuote] = useState("Sparking up the feed...");

    useEffect(() => {
        const initStore = async () => {
            const store = useStudyStore.getState();
            if (!store.isInitialized) {
                await store.initializeData();
            }
        };
        initStore();
    }, []);

    // Timer Engine
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => decrementTimer(), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, decrementTimer]);

    useEffect(() => {
        const clockTimer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(clockTimer);
    }, []);

    // Dynamic Sparks Feed Fetcher
    useEffect(() => {
        const fetchSpark = async () => {
            const { getRandomQuote } = await import("@/lib/quotes");
            const prompt = "You are Chum, a cozy, lo-fi loving study buddy. Give me exactly one short, inspiring sentence about focus, time management, or well-being to start the day. Do not use quotation marks.";
            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: prompt }],
                        stream: false
                    })
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error("Cloud failed");
                setSparkQuote(data.response);
            } catch (e) {
                // Local Fallback
                try {
                    const res = await fetch(`${useStudyStore.getState().ollamaUrl}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ model: "llama3.2:1b", messages: [{ role: "user", content: prompt }], stream: false })
                    });
                    const data = await res.json();
                    setSparkQuote(data.message.content);
                } catch (err) {
                    setSparkQuote(getRandomQuote());
                }
            }
        };
        fetchSpark();
    }, []);

    // 🕵️ Task Deadline Enforcement Check
    useEffect(() => {
        if (!isInitialized || tasks.length === 0) return;

        const now = new Date();
        const overdueTasks = tasks.filter(t => !t.isCompleted && t.deadline && new Date(t.deadline) < now);
        const upcomingTasks = tasks.filter(t => !t.isCompleted && t.deadline &&
            new Date(t.deadline) > now &&
            (new Date(t.deadline).getTime() - now.getTime()) < 3600000 * 2 // within 2 hours
        );

        overdueTasks.forEach(t => {
            const alreadyNotified = notifications.some(n => n.title.includes(t.title) && n.type === 'error');
            if (!alreadyNotified) {
                addNotification({
                    category: 'activity',
                    type: 'error',
                    title: `Overdue: ${t.title}`,
                    message: "This bloom has withered! Complete it immediately to restore garden harmony."
                });
            }
        });

        upcomingTasks.forEach(t => {
            const alreadyNotified = notifications.some(n => n.title.includes(t.title) && n.type === 'warning');
            if (!alreadyNotified) {
                addNotification({
                    category: 'activity',
                    type: 'warning',
                    title: `Approaching: ${t.title}`,
                    message: "The sun is setting on this quest. Finalize it within 2 hours!"
                });
            }
        });
    }, [isInitialized, tasks.length]);

    // 🐸 FROG PROTOCOL: Morning Reminder
    useEffect(() => {
        if (!isInitialized) return;
        const now = new Date();
        const frogTask = tasks.find(t => t.isFrog && !t.isCompleted);
        const currentHour = now.getHours();

        if (frogTask && currentHour >= 8 && currentHour < 12) {
            const alreadyNotified = notifications.some(n => n.title.includes("The Frog is Waiting") && (Date.now() - new Date(n.timestamp).getTime()) < 3600000 * 4);
            if (!alreadyNotified) {
                addNotification({
                    category: 'activity',
                    type: 'warning',
                    title: "The Frog is Waiting",
                    message: "It's morning! Eat your big frog first to finish the day as a champion."
                });
                if (triggerChumToast) {
                    triggerChumToast(
                        <span><strong className="text-orange-400">🐸 RIBBIT!</strong><br />Your biggest task is staring at you. Eat it now to find true peace.</span>,
                        'warning'
                    );
                }
            }
        }
    }, [isInitialized, tasks, activeFramework]);

    // 🌙 EVENING RITUAL: Wrap Up (Start at 9 PM)
    useEffect(() => {
        if (!isInitialized) return;
        const currentHour = new Date().getHours();
        if (currentHour >= 21) {
            const alreadyNotified = notifications.some(n => n.title === "Evening Ritual 🌙" && (Date.now() - new Date(n.timestamp).getTime()) < 3600000 * 4);
            if (!alreadyNotified) {
                const ritualMsg = "The sun has set on today's garden. Perform a Neural Wrap-up to preserve your progress.";

                // 1. Activity Tab
                addNotification({
                    category: 'activity',
                    type: 'info',
                    title: "Evening Ritual 🌙",
                    message: ritualMsg
                });

                // 2. Chum Toast
                if (triggerChumToast) {
                    triggerChumToast(
                        <span><strong className="text-yellow-400">🌙 EVENING RITUAL</strong><br />Time to synchronize your day's growth.</span>,
                        'info',
                        () => useStudyStore.getState().setIsUnDoneModalOpen(true)
                    );
                }

                // 3. Web Push (already handled inside addNotification if permission granted)
            }
        }
    }, [isInitialized, notifications.length]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };


    const totalSeconds = 1500;
    const strokeOffset = 283 - (283 * (timeLeft / totalSeconds));
    const scoreOffset = 110 - (110 * (focusScore / 100));
    const formattedDate = time.toISOString().split('T')[0];
    const xpRequirement = calculateXpRequirement(level);
    const xpProgress = Math.min(100, Math.max(0, (xp / xpRequirement) * 100));

    // 👇 1. PUT THE GREETING LOGIC RIGHT HERE!
    const currentHour = time.getHours();
    let greeting = "Good Evening";
    if (currentHour >= 5 && currentHour < 12) {
        greeting = "Good Morning";
    } else if (currentHour >= 12 && currentHour < 17) {
        greeting = "Good Afternoon";
    }

    // Attempt to grab the user's name from the store, falling back to "Guardian"
    const store = useStudyStore();
    const rawName = (store.displayName?.trim() || store.fullName?.trim());
    const displayName = rawName || store.userEmail?.split('@')[0] || "Guardian";

    // Check if we should highlight the brain reset button (10 minute window)
    const isResetHighlighted = useMemo(() => {
        if (!lastResetHighlightAt) return false;
        const diff = (new Date().getTime() - new Date(lastResetHighlightAt as string).getTime()) / 60000;
        return diff < 10;
    }, [lastResetHighlightAt]);
    // 👆 END OF GREETING LOGIC

    // Drag and Drop Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const task = validTasks.find(t => t.id === event.active.id);
        setActiveDragTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;

        if (over && over.id === "completion-zone") {
            const task = tasks.find(t => t.id === active.id);

            if (requireCompletionConfirmation) {
                // Show confirmation modal instead of immediately completing
                setConfirmationModal({ isOpen: true, taskId: active.id as string });
            } else {
                // Complete immediately
                completeTaskNow(active.id as string, task);
            }
        }
    };

    const completeTaskNow = (taskId: string, task?: Task) => {
        const taskData = task || tasks.find(t => t.id === taskId);

        // ⚡ Neural Bloom Celebration
        playChime();

        // Get the task card's position for accurate confetti
        const cardElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
        const confettiOrigin = cardElement 
            ? {
                x: (cardElement.getBoundingClientRect().left + cardElement.getBoundingClientRect().width / 2) / window.innerWidth,
                y: (cardElement.getBoundingClientRect().top + cardElement.getBoundingClientRect().height / 2) / window.innerHeight
              }
            : { x: 0.5, y: 0.4 }; // Fallback to center

        // Confetti burst from the task card
        confetti({
            particleCount: 100,
            spread: 80,
            origin: confettiOrigin,
            colors: ['#2dd4bf', '#fbbf24', '#f87171', '#8b5cf6'],
            zIndex: 10000
        });

        setAnimatingTaskId(taskId);

        setTimeout(() => {
            completeTask(taskId);
            setAnimatingTaskId(null);
        }, 800);

        // 🐸 Special Celebration for Frogs
        if (taskData?.isFrog) {
            triggerChumToast(
                <span><strong className="text-emerald-400">🏆 FROG CONSUMED!</strong><br />You've conquered your biggest fear. The rest of the day is a breeze!</span>,
                'success'
            );
            addNotification({
                category: 'activity',
                type: 'success',
                title: "Frog Eaten!",
                message: "The hardest part of the day is behind you. High-frequency focus achieved."
            });
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={`max-w-[1400px] mx-auto pb-24 md:pb-12 space-y-6 px-4 md:px-0 transition-all duration-500 ${confirmationModal.isOpen ? 'opacity-30 blur-md pointer-events-none' : 'opacity-100 blur-0'}`}>

                {/* HEADER */}
                <header className="flex justify-between items-center gap-6 mb-4 pt-4 md:pt-0">
                    <div className="flex-1 min-w-0 pr-2 flex items-center gap-4">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--text-main)] leading-tight flex flex-wrap gap-x-2">
                            <span>{greeting},</span>
                            <span className="text-[var(--accent-teal)]">{displayName}!</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="text-base md:text-xl font-black text-[var(--text-main)] leading-none">{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            <span className="text-[var(--accent-teal)] font-bold tracking-widest uppercase text-[8px] md:text-[10px] mt-1 whitespace-nowrap">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <SquishyButton
                            onClick={() => setIsNotificationCenterOpen(true)}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative shrink-0 border-none bg-transparent shadow-none"
                        >
                            <motion.div
                                whileHover={{ 
                                    rotate: [0, -15, 15, -15, 15, 0],
                                    scale: 1.1
                                }}
                                transition={{ duration: 0.5 }}
                            >
                                <Bell size={24} />
                            </motion.div>
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-(--bg-dark) flex items-center justify-center">
                                    <span className="text-[8px] font-black text-white">{unreadCount}</span>
                                </span>
                            )}
                        </SquishyButton>
                    </div>
                </header>

                {/* SPARKS FEED */}
                <fieldset id="sparks-feed" className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-5 pb-5 pt-2 mt-4 mb-4">
                    <legend className="ml-4 px-2 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                        <Zap size={14} className="text-[var(--accent-yellow)]" /> {terms.sparksFeed}
                    </legend>
                    <div className="text-center mt-1">
                        <p className="text-[var(--text-main)] italic text-sm">"{sparkQuote}"</p>
                        <p className="text-[var(--accent-teal)] text-xs font-bold mt-2">— Chum</p>
                    </div>
                </fieldset>

                {/* TOP ROW: Score, Reset, Timer */}
                <section id="dashboard-timer-core" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-center gap-8 shadow-sm relative overflow-hidden">
                        {!isInitialized ? (
                            <div className="w-full h-full flex items-center gap-4 animate-pulse">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-(--border-color)" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-(--border-color) rounded w-1/2" />
                                    <div className="h-8 bg-(--border-color) rounded w-full" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="relative w-28 h-20 md:w-32 md:h-24 flex flex-col items-center justify-end">
                                    <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full overflow-visible">
                                        {/* The magical pathLength="100" standardizes the stroke calculation perfectly */}
                                        <path d="M 10 45 A 35 35 0 0 1 90 45" stroke="var(--border-color)" strokeWidth="10" fill="none" strokeLinecap="round" pathLength="100" />
                                        <path
                                            d="M 10 45 A 35 35 0 0 1 90 45"
                                            stroke="var(--accent-teal)"
                                            strokeWidth="10" fill="none" strokeLinecap="round"
                                            pathLength="100"
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - focusScore}
                                            style={{
                                                filter: focusGlowing ? 'drop-shadow(0px 0px 16px var(--accent-teal))' : 'drop-shadow(0px 0px 8px var(--accent-teal))',
                                                transition: focusGlowing ? 'filter 0.5s ease-out' : 'stroke-dashoffset 1s ease-out, filter 0.5s ease-out'
                                            }}
                                        />
                                    </svg>
                                    {/* Glitter effect container */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {focusGlitter && <GlitterEffect x={90} y={50} count={12} color="var(--accent-teal)" duration={0.8} />}
                                    </div>
                                    <div className="flex flex-col items-center z-10 mb-[-5px]">
                                        <span className="text-2xl md:text-3xl font-bold text-[var(--text-main)] leading-none">{focusScore}</span>
                                        <span className="text-[8px] md:text-[9px] text-[var(--text-muted)] font-bold tracking-widest uppercase mt-1">{terms.focusScore}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center items-center gap-3 sm:gap-4 min-w-0 text-center">
                                    <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-xs md:text-sm">
                                        <Flame size={16} className="text-[var(--accent-cyan)] md:size-8" /> {totalSessions} Focus Flows
                                    </div>
                                    <SquishyButton
                                        onClick={() => useStudyStore.getState().openFocusModal()}
                                        className="px-4 py-2 md:py-2.5 rounded-lg bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] font-bold hover:bg-[var(--accent-teal)] hover:text-[#0b1211] transition-all text-xs md:text-sm border border-[var(--accent-teal)]/30 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                                    >
                                        <Pin size={14} /> Focus
                                    </SquishyButton>
                                </div>
                            </>
                        )}
                    </div>

                    <SquishyButton
                        id="dashboard-brain-reset"
                        onClick={() => setIsBrainResetOpen(true)}
                        className={`bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm cursor-pointer group relative overflow-hidden transition-all duration-700 w-full ${isResetHighlighted
                            ? "border-[var(--accent-teal)] shadow-[0_0_30px_rgba(45,212,191,0.4)] ring-4 ring-[var(--accent-teal)]/20 ring-offset-4 ring-offset-[var(--bg-dark)]"
                            : "hover:border-[var(--accent-teal)]/50"
                            }`}
                    >
                        {isResetHighlighted && (
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-teal)]/10 to-transparent animate-pulse" />
                        )}
                        <div className="absolute inset-0 bg-[var(--accent-teal)] opacity-0 group-hover:opacity-5 transition-opacity duration-700"></div>
                        <Brain size={48} className={`text-[var(--accent-teal)] mb-3 group-hover:scale-110 transition-transform duration-500 ${isResetHighlighted ? "animate-bounce" : ""}`} style={{ filter: 'drop-shadow(0px 0px 10px var(--accent-teal))' }} />
                        <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">{terms.brainReset}</h2>
                        <p className="text-[var(--text-muted)] text-xs font-medium">
                            {isResetHighlighted ? "Time for a brain reset!" : "Breathe deeply"}
                        </p>
                    </SquishyButton>

                </section>

                {/* MIDDLE ROW: Pet */}
                <section id="dashboard-ascension-module" className="grid grid-cols-1 lg:grid-cols-1 gap-5">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 shadow-sm cursor-pointer hover:border-[var(--accent-teal)]/50 transition-colors">

                        {/* Strictly locked 24x24 container */}
                        <div className="relative w-20 h-20 md:w-24 md:h-24 min-w-[5rem] md:min-w-[6rem] min-h-[5rem] md:min-h-[6rem] bg-black/20 rounded-2xl flex items-center justify-center border border-[var(--border-color)] flex-shrink-0">

                            {/* Bulletproof wrapper */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden pointer-events-none">
                                <ChumRenderer size="w-14 h-14 md:w-16 md:h-16 scale-125 translate-y-1.5" />
                            </div>
                            <motion.div
                                key={level}
                                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                className="absolute -bottom-3 bg-gradient-to-r from-[var(--accent-yellow)] to-orange-400 text-black text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] z-10"
                            >
                                {terms.level} {level}
                            </motion.div>
                        </div>

                        {/* Added min-w-0 here to ensure the text doesn't overflow */}
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2 sm:gap-0">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                    <AnimatePresence mode="wait">
                                        <motion.h3
                                            key={level}
                                            initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                            exit={{ y: -20, opacity: 0, filter: 'blur(10px)' }}
                                            transition={{ duration: 0.5, ease: "backOut" }}
                                            className="text-lg md:text-xl font-black bg-gradient-to-r from-[var(--text-main)] via-[var(--accent-teal)] to-[var(--text-main)] bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent truncate max-w-[200px] md:max-w-none"
                                        >
                                            {getTitleForLevel(level)}
                                        </motion.h3>
                                    </AnimatePresence>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] font-bold text-[9px] md:text-[10px] uppercase tracking-wide whitespace-nowrap">
                                        <Flame size={12} /> {dailyStreak} {terms.dayStreak}
                                    </div>
                                </div>
                                <motion.span
                                    key={xp}
                                    initial={{ scale: 1.1, color: "var(--accent-teal)" }}
                                    animate={{ scale: 1, color: "var(--text-muted)" }}
                                    className="text-[9px] md:text-[10px] font-mono text-[var(--text-muted)] font-bold tracking-widest whitespace-nowrap"
                                >
                                    {terms.xp}: {xp}/{xpRequirement}
                                </motion.span>
                            </div>
                            <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden mb-2 relative">
                                <motion.div
                                    className="h-full bg-[var(--accent-teal)] rounded-full"
                                    style={{
                                        filter: xpGlowing ? 'drop-shadow(0px 0px 12px var(--accent-teal))' : 'drop-shadow(0px 0px 4px var(--accent-teal))',
                                    }}
                                    animate={{
                                        width: `${xpProgress}%`,
                                        boxShadow: xpGlowing
                                            ? '0 0 12px rgba(45, 212, 191, 0.8), inset 0 0 8px rgba(45, 212, 191, 0.6)'
                                            : '0 0 4px rgba(45, 212, 191, 0.3), inset 0 0 4px rgba(45, 212, 191, 0.2)'
                                    }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                                {/* Glitter effect at the end of the XP bar */}
                                {xpGlitter && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <GlitterEffect
                                            x={xpProgress}
                                            y={50}
                                            count={10}
                                            color="var(--accent-teal)"
                                            duration={0.8}
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs md:text-sm text-[var(--text-muted)] italic truncate">"Nurture your blooms, grow your soul."</p>
                        </div>
                    </div>

                </section>

                {/* CURRENT FOCUS */}
                <section className="pt-2 relative">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-main)]">Current Focus</h2>
                        <span className="bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
                            <Calendar size={12} /> {formattedDate}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

                        <AnimatePresence>
                            {!isInitialized ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl animate-pulse p-4 flex flex-col gap-3">
                                        <div className="h-4 bg-[var(--border-color)] rounded w-3/4" />
                                        <div className="h-3 bg-[var(--border-color)] rounded w-1/2" />
                                        <div className="mt-auto flex gap-2">
                                            <div className="h-6 w-12 bg-[var(--border-color)] rounded" />
                                            <div className="h-6 w-12 bg-[var(--border-color)] rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    {activeTasks.slice(0, 3).map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onToggleSelect={onToggleSelect}
                                            selected={selectedIds.includes(task.id)}
                                            isAnimating={animatingTaskId === task.id}
                                        />
                                    ))}

                                    {Array.from({ length: Math.max(0, 3 - activeTasks.length) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="min-h-[140px] border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs md:text-sm font-bold tracking-wide">
                                            + Open Slot
                                        </div>
                                    ))}
                                </>
                            )}
                        </AnimatePresence>

                        {showFourthTask ? (
                            <TaskCard
                                key={activeTasks[3].id}
                                task={activeTasks[3]}
                                onToggleSelect={onToggleSelect}
                                selected={selectedIds.includes(activeTasks[3].id)}
                                isAnimating={animatingTaskId === activeTasks[3].id}
                            />
                        ) : showGardenShortcut ? (
                            <button
                                type="button"
                                onClick={() => router.push("/garden")}
                                className="min-h-[140px] border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex flex-col items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent-teal)]"
                            >
                                <span className="text-lg md:text-xl mb-1">✨</span>
                                <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">{terms.crystalGarden}</span>
                                <span className="text-[9px] md:text-[10px] opacity-70 mt-1">+{hiddenTaskCount} hidden blooms</span>
                            </button>
                        ) : (
                            <div className="min-h-[140px] border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs md:text-sm font-bold tracking-wide">
                                + Open Slot
                            </div>
                        )}
                    </div>

                    {/* BULK ACTION BAR */}
                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-(--bg-sidebar) border-2 border-(--accent-teal) rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-[60] backdrop-blur-xl"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-(--accent-teal) uppercase tracking-widest">{selectedIds.length} Selected</span>
                                    <span className="text-[9px] font-bold text-(--text-muted) uppercase">Bulk Mode Active</span>
                                </div>
                                <div className="h-8 w-[1px] bg-(--border-color)" />
                                <div className="flex gap-2">
                                    <button onClick={handleBulkComplete} className="px-4 py-2 bg-(--accent-teal) text-black rounded-xl text-[10px] font-black uppercase hover:bg-white transition-all">Master All</button>
                                    <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Release All</button>
                                    <button onClick={() => setSelectedIds([])} className="p-2 text-(--text-muted) hover:text-white transition-colors"><X size={16} /></button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {bulkAction && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl"
                                >
                                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                                        {bulkAction === 'delete' ? 'Release Selected Quests?' : 'Master Selected Quests?'}
                                    </h3>
                                    <p className="text-sm text-[var(--text-muted)] mb-6">
                                        {bulkAction === 'delete'
                                            ? `Release ${selectedIds.length} quests back to the void?`
                                            : `Master ${selectedIds.length} blooms simultaneously?`}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <SquishyButton
                                            onClick={() => setBulkAction(null)}
                                            className="py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] transition-colors shadow-none"
                                        >
                                            Cancel
                                        </SquishyButton>
                                        <SquishyButton
                                            onClick={async () => {
                                                if (bulkAction === 'delete') {
                                                    await runBulkDelete();
                                                } else {
                                                    await runBulkComplete();
                                                }
                                                setBulkAction(null);
                                            }}
                                            className={`py-3 rounded-xl font-bold transition-colors ${bulkAction === 'delete'
                                                ? 'bg-red-500/90 text-white hover:bg-red-500'
                                                : 'bg-[var(--accent-teal)] text-[#0b1211] hover:brightness-110'
                                                }`}
                                        >
                                            Confirm
                                        </SquishyButton>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Quest Progress</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center mb-8 border-b border-[var(--border-color)] pb-8">
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{activeTasks.length}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">{terms.incomplete}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center border-y sm:border-y-0 sm:border-x border-[var(--border-color)] py-4 sm:py-0">
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{completedTasks.length}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">{terms.completed}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                {/* 👇 Now divides literal seconds by 3600 to get true hours! */}
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{(totalSecondsTracked / 3600).toFixed(1)}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">Flow Hours</span>
                            </div>
                        </div>
                        <div className={`flex flex-col items-center justify-center text-center py-6 transition-all duration-500 ${confirmationModal.isOpen ? 'opacity-20 blur-xl pointer-events-none' : 'opacity-100 blur-0'}`}>
                            {!isInitialized ? (
                                <div className="flex flex-col items-center gap-2 animate-pulse w-full">
                                    <div className="w-6 h-6 rounded-full bg-[var(--border-color)]" />
                                    <div className="h-3 bg-[var(--border-color)] rounded w-1/3" />
                                </div>
                            ) : (
                                <div className="w-full">
                                    {completedTasks.length > 0 ? (
                                        <div className="flex flex-wrap justify-center gap-4 w-full">
                                            {completedTasks
                                                .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
                                                .slice(0, 4)
                                                .map((task) => (
                                                    <div key={task.id} className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1rem)] min-w-[280px]">
                                                        <TaskCard task={task} locked={true} isMinimized={true} />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[var(--border-color)]" />
                                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">No blooms mastered yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm mt-6">
                        <SyntheticFeed />
                    </div>
                </section>
            </div>

                {/* The Animated Drop Zone Toggle */}
                <AnimatePresence>
                    {activeDragTask && <CompletionDropZone />}
                </AnimatePresence>

                {/* The Floating Drag Visualizer */}
                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask as Task} isOverlay /> : null}
                </DragOverlay>

                <AnimatePresence>
                    {isBrainResetOpen && <BrainResetModal isOpen={isBrainResetOpen} onClose={() => setIsBrainResetOpen(false)} />}
                </AnimatePresence>

                <ConfirmationModal
                    isOpen={confirmationModal.isOpen}
                    title="Confirm Quest Completion"
                    message={`Are you ready to complete this quest? The rewards will be locked in once confirmed.`}
                    confirmText="Confirm & Bloom"
                    cancelText="Cancel"
                    onConfirm={() => {
                        if (confirmationModal.taskId) {
                            completeTaskNow(confirmationModal.taskId);
                        }
                        setConfirmationModal({ isOpen: false, taskId: null });
                    }}
                    onCancel={() => setConfirmationModal({ isOpen: false, taskId: null })}
                />

                <footer className="pt-12 pb-8 border-t border-(--border-color) flex flex-col items-center gap-4">
                    <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">
                        <button className="hover:text-(--accent-teal) transition-colors">Terms of Service</button>
                        <button className="hover:text-(--accent-teal) transition-colors">Privacy & Cookies</button>
                        <button onClick={() => useStudyStore.getState().setCompletedTutorial(false)} className="hover:text-(--accent-teal) transition-colors text-(--accent-teal)">Replay Tutorial</button>
                    </div>
                    <p className="text-[9px] text-(--text-muted) opacity-50 uppercase tracking-[0.3em] font-black">Neural Link Established © 2026 StudyBuddy</p>
                </footer>
        </DndContext>
    );
}
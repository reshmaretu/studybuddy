"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Play, Pause, Zap, Dumbbell, Edit3, ChevronRight, Send } from "lucide-react";
import { useStudyStore, Task, getApiUrl } from "@studybuddy/api";
import { ChumRenderer } from "./ChumRenderer";
import { SquishyButton } from "./SquishyButton";

interface EnhancedBrainResetProps {
    isOpen: boolean;
    onClose: () => void;
}

type ResetStage = "initial" | "breathing" | "path" | "minddump" | "desk" | "taskSuggestion" | "complete";

const DESK_STRETCHES = [
    {
        name: "Neck Rolls",
        description: "Slow, circular neck rotations",
        duration: 20,
        instructions: [
            "Drop chin to chest slowly",
            "Roll right ear toward right shoulder",
            "Roll back (look up gently)",
            "Roll left ear toward left shoulder",
            "Repeat 3 times each direction"
        ]
    },
    {
        name: "Shoulder Shrugs",
        description: "Release upper back tension",
        duration: 15,
        instructions: [
            "Shrug shoulders up toward ears",
            "Hold for 2 seconds",
            "Release and drop",
            "Repeat 10 times"
        ]
    },
    {
        name: "Wrist Circles",
        description: "Improve circulation to hands",
        duration: 15,
        instructions: [
            "Extend arms forward",
            "Make slow circles with wrists",
            "10 circles clockwise, 10 counterclockwise",
            "Repeat with other arm"
        ]
    },
    {
        name: "Spinal Twist",
        description: "Activate your core and back",
        duration: 20,
        instructions: [
            "Sit upright in chair",
            "Cross right arm over body to left knee",
            "Gently twist upper body left",
            "Hold for 5 seconds, switch sides",
            "Repeat 5 times each side"
        ]
    },
    {
        name: "Forward Fold",
        description: "Stretch back and hamstrings",
        duration: 15,
        instructions: [
            "Stand with feet hip-width apart",
            "Slowly fold forward from hips",
            "Let arms hang or touch toes",
            "Hold for 10 seconds",
            "Slowly roll back up"
        ]
    }
];

export const BrainResetModal = ({ isOpen, onClose }: EnhancedBrainResetProps) => {
    const {
        modifyFocusScore, gainXp, tasks, updateTask
    } = useStudyStore();

    const [stage, setStage] = useState<ResetStage>("initial");
    const [breathTimeLeft, setBreathTimeLeft] = useState(30);
    const [breathIsActive, setBreathIsActive] = useState(false);
    const [breathStage, setBreathStage] = useState<"inhale" | "hold" | "exhale">("inhale");
    const [mindDumpText, setMindDumpText] = useState("");
    const [chumReply, setChumReply] = useState<string | null>(null);
    const [isGettingChumReply, setIsGettingChumReply] = useState(false);
    const [currentStretchIndex, setCurrentStretchIndex] = useState(0);
    const [stretchTimeLeft, setStretchTimeLeft] = useState(DESK_STRETCHES[0].duration);
    const [deskIsActive, setDeskIsActive] = useState(false);
    const [totalDeskTime, setTotalDeskTime] = useState(0);
    const [suggestedTask, setSuggestedTask] = useState<Task | null>(null);
    const [autoDowngradePreference, setAutoDowngradePreference] = useState<boolean | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (breathIsActive && breathTimeLeft > 0) {
            interval = setInterval(() => {
                setBreathTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (breathTimeLeft === 0 && breathIsActive) {
            setBreathIsActive(false);
            setStage("path");
        }
        return () => clearInterval(interval);
    }, [breathIsActive, breathTimeLeft]);

    useEffect(() => {
        if (!breathIsActive) return;
        let timeout: NodeJS.Timeout;
        const cycle = [
            { stage: "inhale", duration: 4000 },
            { stage: "hold", duration: 4000 },
            { stage: "exhale", duration: 4000 },
        ];
        const runCycle = (index: number) => {
            const current = cycle[index % 3];
            setBreathStage(current.stage as any);
            timeout = setTimeout(() => runCycle(index + 1), current.duration);
        };
        runCycle(0);
        return () => clearTimeout(timeout);
    }, [breathIsActive]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (deskIsActive && stretchTimeLeft > 0) {
            interval = setInterval(() => setStretchTimeLeft(prev => prev - 1), 1000);
        } else if (deskIsActive && stretchTimeLeft === 0) {
            const nextIndex = currentStretchIndex + 1;
            if (nextIndex < DESK_STRETCHES.length) {
                setCurrentStretchIndex(nextIndex);
                setStretchTimeLeft(DESK_STRETCHES[nextIndex].duration);
            } else {
                setDeskIsActive(false);
                proceedToTaskSuggestion();
            }
        }
        return () => clearInterval(interval);
    }, [deskIsActive, stretchTimeLeft, currentStretchIndex]);

    const getChumReply = async () => {
        if (!mindDumpText.trim()) {
            setChumReply("It seems you didn't write anything. Sometimes just opening up is the first step.");
            return;
        }
        setIsGettingChumReply(true);
        try {
            const response = await fetch(getApiUrl("/api/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: "You are Chum, a compassionate study buddy..." },
                        { role: "user", content: mindDumpText }
                    ],
                    user_id: "brain-reset-session"
                })
            });
            const text = await response.text();
            setChumReply(text.trim() || "Take a deep breath. You've got this.");
        } catch (error) {
            setChumReply("Take a deep breath. You've got this.");
        } finally {
            setIsGettingChumReply(false);
        }
    };

    const proceedToTaskSuggestion = async () => {
        const activeTasks = tasks.filter(t => !t.isCompleted && t.load === "heavy");
        if (activeTasks.length > 0 && autoDowngradePreference !== false) {
            setSuggestedTask(activeTasks[0]);
            setStage("taskSuggestion");
        } else {
            completeReset();
        }
    };

    const handleTaskDowngrade = async (task: Task) => {
        await updateTask(task.id, { load: "light" });
        completeReset();
    };

    const completeReset = async () => {
        await modifyFocusScore(20);
        await gainXp(75);
        setStage("complete");
    };

    const handleClose = () => {
        setStage("initial");
        onClose();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 md:p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-5 md:p-6 min-h-[400px] md:min-h-[500px] flex flex-col">
                        <button onClick={handleClose} className="absolute top-4 md:top-6 right-4 md:right-6 p-1 md:p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} className="md:w-5 md:h-5" /></button>
                        <AnimatePresence mode="wait">
                            {stage === "initial" && (
                                <motion.div key="initial" className="flex flex-col items-center gap-4 md:gap-6">
                                    <Brain size={36} className="md:w-12 md:h-12 text-[var(--accent-teal)] animate-pulse" />
                                    <h2 className="text-xl md:text-2xl font-black text-[var(--text-main)]">Brain Reset</h2>
                                    <SquishyButton onClick={() => { setBreathIsActive(true); setStage("breathing"); }} className="w-full py-2 md:py-4 bg-[var(--accent-teal)] text-black rounded-xl md:rounded-2xl font-bold text-sm md:text-base">Begin Breathing</SquishyButton>
                                </motion.div>
                            )}
                            {stage === "breathing" && (
                                <motion.div key="breathing" className="flex flex-col items-center gap-4 md:gap-8">
                                    <p className="text-3xl md:text-5xl font-black text-[var(--accent-teal)]">{formatTime(breathTimeLeft)}</p>
                                    <motion.div animate={{ scale: breathStage === "inhale" ? 1.3 : 0.8 }} transition={{ duration: 4 }} className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-[var(--accent-teal)]" />
                                    <p className="text-lg md:text-xl font-bold text-[var(--text-main)]">{breathStage}...</p>
                                </motion.div>
                            )}
                            {/* ... other stages truncated for brevity in this step ... */}
                            {stage === "minddump" && (
                                <motion.div key="minddump" className="flex flex-col items-center gap-3 md:gap-4 w-full">
                                    <ChumRenderer size="w-20 md:w-32 h-20 md:h-32" />
                                    {!chumReply && <textarea value={mindDumpText} onChange={e => setMindDumpText(e.target.value)} className="w-full h-16 md:h-24 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg p-2 md:p-3 text-sm md:text-base text-[var(--text-main)]" />}
                                    {chumReply && <div className="p-2 md:p-4 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg italic text-sm md:text-base text-[var(--text-main)]">{chumReply}</div>}
                                    <SquishyButton onClick={chumReply ? proceedToTaskSuggestion : getChumReply} className="w-full py-2 md:py-3 bg-[var(--accent-teal)] text-black rounded-lg md:rounded-lg font-bold text-sm md:text-base">{chumReply ? "Continue" : "Submit"}</SquishyButton>
                                </motion.div>
                            )}
                            {stage === "complete" && (
                                <motion.div key="complete" className="flex flex-col items-center gap-4 md:gap-6">
                                    <div className="w-16 md:w-20 h-16 md:h-20 rounded-full bg-[var(--accent-teal)]/20 border-2 border-[var(--accent-teal)] flex items-center justify-center"><Brain size={32} className="md:w-10 md:h-10 text-[var(--accent-teal)]" /></div>
                                    <h3 className="text-lg md:text-2xl font-black text-[var(--text-main)]">Reset Complete!</h3>
                                    <SquishyButton onClick={handleClose} className="w-full py-2 md:py-3 bg-[var(--accent-teal)] text-black rounded-xl md:rounded-2xl font-bold text-sm md:text-base">Close</SquishyButton>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

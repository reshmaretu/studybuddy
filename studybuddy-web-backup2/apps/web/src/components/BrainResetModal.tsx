"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Play, Pause, Zap, Dumbbell, Edit3, ChevronRight, Send } from "lucide-react";
import { useStudyStore, Task } from "@/store/useStudyStore";
import ChumRenderer from "@/components/ChumRenderer";
import { SquishyButton } from "@studybuddy/ui";

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

export default function EnhancedBrainResetModal({ isOpen, onClose }: EnhancedBrainResetProps) {
    const {
        modifyFocusScore, gainXp, tasks, updateTask, resetBrainResetCycle,
        aiKeys
    } = useStudyStore();

    // Main flow states
    const [stage, setStage] = useState<ResetStage>("initial");

    // Breathing states
    const [breathTimeLeft, setBreathTimeLeft] = useState(30);
    const [breathIsActive, setBreathIsActive] = useState(false);
    const [breathStage, setBreathStage] = useState<"inhale" | "hold" | "exhale">("inhale");

    // Mind Dump states - NO TIMER, manual submission
    const [mindDumpText, setMindDumpText] = useState("");
    const [chumReply, setChumReply] = useState<string | null>(null);
    const [isGettingChumReply, setIsGettingChumReply] = useState(false);

    // Desk Mobility states
    const [currentStretchIndex, setCurrentStretchIndex] = useState(0);
    const [stretchTimeLeft, setStretchTimeLeft] = useState(DESK_STRETCHES[0].duration);
    const [deskIsActive, setDeskIsActive] = useState(false);
    const [totalDeskTime, setTotalDeskTime] = useState(0);

    // Task Downgrading states
    const [suggestedTask, setSuggestedTask] = useState<Task | null>(null);
    const [autoDowngradePreference, setAutoDowngradePreference] = useState<boolean | null>(null);

    // Breathing timer
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (breathIsActive && breathTimeLeft > 0) {
            interval = setInterval(() => {
                setBreathTimeLeft(prev => {
                    if (prev <= 1) {
                        setBreathIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (breathTimeLeft === 0 && breathIsActive) {
            setBreathIsActive(false);
            setStage("path");
        }

        return () => clearInterval(interval);
    }, [breathIsActive, breathTimeLeft]);

    // Breathing animation cycle
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
            timeout = setTimeout(() => {
                runCycle(index + 1);
            }, current.duration);
        };

        runCycle(0);
        return () => clearTimeout(timeout);
    }, [breathIsActive]);

    // Desk Mobility timer - FIXED: properly sequences stretches
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (deskIsActive && stretchTimeLeft > 0) {
            interval = setInterval(() => {
                setStretchTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (deskIsActive && stretchTimeLeft === 0) {
            // Time for this stretch ended
            const nextIndex = currentStretchIndex + 1;
            if (nextIndex < DESK_STRETCHES.length) {
                // Move to next stretch
                setCurrentStretchIndex(nextIndex);
                setStretchTimeLeft(DESK_STRETCHES[nextIndex].duration);
            } else {
                // All stretches done
                setDeskIsActive(false);
                proceedToTaskSuggestion();
            }
            setTotalDeskTime(prev => prev + 1);
        }

        return () => clearInterval(interval);
    }, [deskIsActive, stretchTimeLeft, currentStretchIndex]);

    // Track total desk time
    useEffect(() => {
        if (deskIsActive) {
            const timer = setInterval(() => {
                setTotalDeskTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [deskIsActive]);

    // Get Chum's reply to mind dump - FIXED FOR STREAMING
    const getChumReply = async () => {
        if (!mindDumpText.trim()) {
            setChumReply("It seems you didn't write anything. Sometimes just opening up is the first step. Want to try again?");
            return;
        }

        setIsGettingChumReply(true);

        const systemPrompt = `You are Chum, a compassionate study buddy. The user just brain-dumped their stresses and worries. Your job is to:
1. Validate their feelings (acknowledge what they shared)
2. Suggest ONE actionable step they can take right now (keep it small and doable)
3. Encourage them briefly

Keep your response to 2-3 sentences max. Be warm, understanding, and practical.`;

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `User's mind dump: "${mindDumpText}"` }
                    ],
                    user_id: "brain-reset-session"
                })
            });

            if (!response.ok) {
                setChumReply("Take a deep breath. You've got this. One step at a time.");
                setIsGettingChumReply(false);
                return;
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                setChumReply("Take a deep breath. You've got this. One step at a time.");
                setIsGettingChumReply(false);
                return;
            }

            let fullText = "";
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
            }

            // Decode any remaining bytes
            fullText += decoder.decode();

            if (fullText.trim()) {
                setChumReply(fullText.trim());
            } else {
                setChumReply("Take a deep breath. You've got this. One step at a time.");
            }
        } catch (error) {
            console.error("Failed to get Chum reply:", error);
            setChumReply("Take a deep breath. You've got this. One step at a time.");
        } finally {
            setIsGettingChumReply(false);
        }
    };

    const proceedToTaskSuggestion = async () => {
        // Find a heavy task to suggest downgrading
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
        if (autoDowngradePreference === null) {
            setAutoDowngradePreference(true);
            localStorage.setItem("autoTaskDowngrade", "true");
        }
        completeReset();
    };

    const handleSkipTaskDowngrade = () => {
        if (autoDowngradePreference === null) {
            setAutoDowngradePreference(false);
            localStorage.setItem("autoTaskDowngrade", "false");
        }
        completeReset();
    };

    const completeReset = async () => {
        await modifyFocusScore(20);
        await gainXp(75);
        resetBrainResetCycle();
        setStage("complete");
    };

    const handleStartBreathe = () => {
        setBreathTimeLeft(30);
        setBreathIsActive(true);
        setStage("breathing");
    };

    const handleStartMindDump = () => {
        setMindDumpText("");
        setChumReply(null);
        setStage("minddump");
    };

    const handleSubmitMindDump = () => {
        getChumReply();
    };

    const handleStartDesk = () => {
        setCurrentStretchIndex(0);
        setStretchTimeLeft(DESK_STRETCHES[0].duration);
        setDeskIsActive(true);
        setTotalDeskTime(0);
        setStage("desk");
    };

    const handleSkip = () => {
        setDeskIsActive(false);
        proceedToTaskSuggestion();
    };

    const handleClose = () => {
        setStage("initial");
        setBreathTimeLeft(30);
        setBreathIsActive(false);
        setMindDumpText("");
        setChumReply(null);
        setCurrentStretchIndex(0);
        setStretchTimeLeft(DESK_STRETCHES[0].duration);
        setDeskIsActive(false);
        onClose();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const breathingScale = breathStage === "inhale" ? 1.3 : breathStage === "hold" ? 1.3 : 0.8;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        {/* Close button */}
                        <SquishyButton
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-10 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-dark)] rounded-lg transition-colors border-none"
                        >
                            <X size={20} />
                        </SquishyButton>

                        <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
                            <AnimatePresence mode="wait">

                                {/* STAGE 1: INITIAL SCREEN */}
                                {stage === "initial" && (
                                    <motion.div
                                        key="initial"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col items-center w-full gap-6"
                                    >
                                        <Brain size={48} className="text-[var(--accent-teal)] animate-pulse" />
                                        <div className="text-center">
                                            <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Brain Reset</h2>
                                            <p className="text-[var(--text-muted)] text-sm">
                                                Start with 30 seconds of breathing, then choose your path
                                            </p>
                                        </div>

                                        <SquishyButton
                                            onClick={handleStartBreathe}
                                            className="w-full py-4 bg-[var(--accent-teal)] text-[#0b1211] rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            <Play size={18} /> Begin with Breathing
                                        </SquishyButton>

                                        <SquishyButton
                                            onClick={handleClose}
                                            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                        >
                                            Skip
                                        </SquishyButton>
                                    </motion.div>
                                )}

                                {/* STAGE 2: BREATHING */}
                                {stage === "breathing" && (
                                    <motion.div
                                        key="breathing"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center w-full gap-8"
                                    >
                                        <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">30 Second Reset</p>
                                        <p className="text-5xl font-black text-[var(--accent-teal)] font-mono">{formatTime(breathTimeLeft)}</p>

                                        <motion.div
                                            animate={{
                                                scale: breathingScale,
                                            }}
                                            transition={{
                                                duration: 4,
                                                ease: "easeInOut",
                                            }}
                                            className="w-40 h-40 rounded-full bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-cyan)] shadow-[0_0_50px_rgba(45,212,191,0.3)]"
                                        />

                                        <p className="text-xl font-bold text-[var(--text-main)] capitalize">
                                            {breathStage === "inhale" && "Breathe In..."}
                                            {breathStage === "hold" && "Hold..."}
                                            {breathStage === "exhale" && "Breathe Out..."}
                                        </p>

                                        <SquishyButton
                                            onClick={() => setBreathIsActive(!breathIsActive)}
                                            className="px-6 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] font-bold hover:border-[var(--accent-teal)] transition-colors"
                                        >
                                            {breathIsActive ? <Pause size={16} /> : <Play size={16} />}
                                        </SquishyButton>

                                        <SquishyButton
                                            onClick={() => setStage("path")}
                                            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                        >
                                            Skip to Path Selection
                                        </SquishyButton>
                                    </motion.div>
                                )}

                                {/* STAGE 3: PATH SELECTION */}
                                {stage === "path" && (
                                    <motion.div
                                        key="path"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col items-center w-full gap-6"
                                    >
                                        <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Now choose your next step</p>

                                        <SquishyButton
                                            onClick={handleStartMindDump}
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--accent-teal)]/50 hover:bg-[var(--accent-teal)]/5 transition-all text-left flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Edit3 size={20} className="text-[var(--accent-teal)] group-hover:scale-110 transition-transform" />
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]">Mind Dump</div>
                                                    <div className="text-xs text-[var(--text-muted)]">~1m 30s • Release anxiety</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] transition-colors" />
                                        </SquishyButton>

                                        <SquishyButton
                                            onClick={handleStartDesk}
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--accent-teal)]/50 hover:bg-[var(--accent-teal)]/5 transition-all text-left flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Dumbbell size={20} className="text-[var(--accent-yellow)] group-hover:scale-110 transition-transform" />
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]">Desk Mobility</div>
                                                    <div className="text-xs text-[var(--text-muted)]">~1m 30s • Get moving</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] transition-colors" />
                                        </SquishyButton>

                                        <SquishyButton
                                            onClick={handleClose}
                                            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                        >
                                            Skip to End
                                        </SquishyButton>
                                    </motion.div>
                                )}

                                {/* STAGE 4: MIND DUMP - NO TIMER, MANUAL SUBMIT */}
                                {stage === "minddump" && (
                                    <motion.div
                                        key="minddump"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center w-full gap-4"
                                    >
                                        <div className="text-center mb-2">
                                            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">Brain Dump</p>
                                            <p className="text-[var(--text-muted)] text-sm">Take your time. Submit whenever you&apos;re ready.</p>
                                        </div>

                                        {/* Chum Preview */}
                                        <div className="w-32 h-32 mb-2">
                                            <ChumRenderer size="w-full h-full" />
                                        </div>

                                        {/* Text Area */}
                                        {!chumReply && (
                                            <textarea
                                                autoFocus
                                                value={mindDumpText}
                                                onChange={(e) => setMindDumpText(e.target.value)}
                                                disabled={isGettingChumReply}
                                                placeholder="Write everything stressing you out... don't worry, you're being heard."
                                                className="w-full h-24 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg p-3 text-[var(--text-main)] text-sm resize-none outline-none focus:border-[var(--accent-teal)] placeholder:text-[var(--text-muted)]/50 disabled:opacity-50"
                                            />
                                        )}

                                        {/* Chum Reply */}
                                        {chumReply && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)]/50 rounded-lg p-4"
                                            >
                                                <p className="text-[var(--text-main)] text-sm leading-relaxed italic">{chumReply}</p>
                                            </motion.div>
                                        )}

                                        {isGettingChumReply && (
                                            <div className="flex items-center gap-2 text-[var(--accent-teal)]">
                                                <div className="animate-spin">⚡</div>
                                                <span className="text-sm">Chum is thinking...</span>
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        {!chumReply && !isGettingChumReply && (
                                            <SquishyButton
                                                onClick={handleSubmitMindDump}
                                                disabled={!mindDumpText.trim()}
                                                className="w-full py-3 bg-[var(--accent-teal)] text-[#0b1211] rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send size={16} /> Submit & Get Chum's Reply
                                            </SquishyButton>
                                        )}

                                        {/* Continue Button */}
                                        {chumReply && (
                                            <SquishyButton
                                                onClick={() => proceedToTaskSuggestion()}
                                                className="w-full py-3 bg-[var(--accent-teal)] text-[#0b1211] rounded-lg font-bold hover:opacity-90 transition-opacity mt-4"
                                            >
                                                Continue
                                            </SquishyButton>
                                        )}

                                        {/* Skip Button */}
                                        {!chumReply && !isGettingChumReply && (
                                        <SquishyButton
                                                onClick={() => {
                                                    setChumReply(null);
                                                    proceedToTaskSuggestion();
                                                }}
                                                className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                            >
                                                Skip Mind Dump
                                            </SquishyButton>
                                        )}
                                    </motion.div>
                                )}

                                {/* STAGE 5: DESK MOBILITY */}
                                {stage === "desk" && (
                                    <motion.div
                                        key="desk"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center w-full gap-6"
                                    >
                                        <div className="text-center">
                                            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">
                                                Stretch {currentStretchIndex + 1} of {DESK_STRETCHES.length}
                                            </p>
                                            <p className="text-4xl font-black text-[var(--accent-yellow)] font-mono mt-2">
                                                {formatTime(stretchTimeLeft)}
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                                                {DESK_STRETCHES[currentStretchIndex].name}
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)] mb-4">
                                                {DESK_STRETCHES[currentStretchIndex].description}
                                            </p>

                                            <div className="bg-[var(--bg-dark)] rounded-lg p-3 text-left space-y-2 mb-4">
                                                {DESK_STRETCHES[currentStretchIndex].instructions.map((instruction, idx) => (
                                                    <div key={idx} className="text-xs text-[var(--text-muted)] flex gap-2">
                                                        <span className="text-[var(--accent-teal)] font-bold">•</span>
                                                        <span>{instruction}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <SquishyButton
                                            onClick={() => setDeskIsActive(!deskIsActive)}
                                            className="px-6 py-2 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] font-bold hover:border-[var(--accent-teal)] transition-colors"
                                        >
                                            {deskIsActive ? <Pause size={16} /> : <Play size={16} />}
                                        </SquishyButton>

                                        <div className="text-xs text-[var(--text-muted)] text-center">
                                            Total time: {formatTime(totalDeskTime)} / ~90s
                                        </div>

                                        <SquishyButton
                                            onClick={handleSkip}
                                            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                        >
                                            Skip Remaining Stretches
                                        </SquishyButton>
                                    </motion.div>
                                )}

                                {/* STAGE 6: TASK SUGGESTION */}
                                {stage === "taskSuggestion" && suggestedTask && (
                                    <motion.div
                                        key="taskSuggestion"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col items-center w-full gap-6"
                                    >
                                        <Zap size={40} className="text-[var(--accent-yellow)]" />

                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Tactical Retreat</h3>
                                            <p className="text-[var(--text-muted)] text-sm mb-4">
                                                You're doing great! How about focusing on something lighter to keep momentum?
                                            </p>
                                        </div>

                                        <div className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg p-4">
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-2">Suggested Light Task</p>
                                            <p className="text-[var(--text-main)] font-bold">{suggestedTask.title}</p>
                                            {suggestedTask.description && (
                                                <p className="text-xs text-[var(--text-muted)] mt-2">{suggestedTask.description}</p>
                                            )}
                                        </div>

                                        <SquishyButton
                                            onClick={() => handleTaskDowngrade(suggestedTask)}
                                            className="w-full py-3 bg-[var(--accent-teal)] text-[#0b1211] rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            <Zap size={16} /> Switch to This Task
                                        </SquishyButton>

                                        <SquishyButton
                                            onClick={handleSkipTaskDowngrade}
                                            className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors border-none bg-transparent shadow-none"
                                        >
                                            Skip
                                        </SquishyButton>

                                        {autoDowngradePreference === null && (
                                            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-main)] transition-colors mt-2">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            localStorage.setItem("autoTaskDowngrade", "true");
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded"
                                                />
                                                Remember my preference
                                            </label>
                                        )}
                                    </motion.div>
                                )}

                                {/* STAGE 7: COMPLETION */}
                                {stage === "complete" && (
                                    <motion.div
                                        key="complete"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex flex-col items-center w-full gap-6"
                                    >
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, ease: "easeInOut" }}
                                            className="w-20 h-20 rounded-full bg-[var(--accent-teal)]/20 border-2 border-[var(--accent-teal)] flex items-center justify-center"
                                        >
                                            <Brain size={40} className="text-[var(--accent-teal)]" />
                                        </motion.div>

                                        <div className="text-center">
                                            <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Reset Complete!</h3>
                                            <p className="text-[var(--text-muted)] text-sm">
                                                You&apos;ve taken care of yourself. Your brain will thank you.
                                            </p>
                                        </div>

                                        <div className="w-full bg-[var(--bg-dark)] rounded-2xl p-4 space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--text-muted)]">Focus Score</span>
                                                <span className="font-bold text-[var(--accent-teal)]">+20</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--text-muted)]">Experience Points</span>
                                                <span className="font-bold text-[var(--accent-yellow)]">+75 XP</span>
                                            </div>
                                        </div>

                                        <SquishyButton
                                            onClick={handleClose}
                                            className="w-full py-3 bg-[var(--accent-teal)] text-[#0b1211] rounded-2xl font-bold hover:opacity-90 transition-opacity"
                                        >
                                            Close
                                        </SquishyButton>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
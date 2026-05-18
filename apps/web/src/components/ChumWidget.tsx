"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, Send, CheckCircle2, Edit3, LogOut, Plus, BrainCircuit, Network, Cpu, WifiOff, Settings, History, Sparkles } from "lucide-react";
import { useStudyStore, ChatMessage, TutorSession, Shard, TaskLoad } from "@/store/useStudyStore";
import { supabase, getChatUrl } from '@/lib/supabase';
import ChumRenderer from "@/components/ChumRenderer";
import { useTerms } from "@/hooks/useTerms";
import { SquishyButton } from "@studybuddy/ui";

interface ChumToast {
    id: string;
    message: string | React.ReactNode;
    type?: 'info' | 'success' | 'warning' | 'error';
    action?: () => void;
    duration?: number;
}

function TypewriterText({ text, speed = 40 }: { text: string, speed?: number }) {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText(""); // Reset when text changes
        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayedText((prev) => prev + text.charAt(index));
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return <>{displayedText}</>;
}

export default function ChumWidget() {
    const { terms, isGamified } = useTerms();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [viewingLog, setViewingLog] = useState<TutorSession | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showQuickArchive, setShowQuickArchive] = useState(false);
    const [readingShard, setReadingShard] = useState<Shard | null>(null);
    const [showBubble, setShowBubble] = useState(false);
    const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [ephemeralMsg, setEphemeralMsg] = useState<{ text: React.ReactNode, type: string, id: number } | null>(null);

    const {
        activeMode, exitMode, isTutorModeActive, activeShardId, exitTutorMode,
        shards, updateShardMastery, aiTier, setAITier, aiKeys, updateAIKeys, selectedModel, setSelectedModel, ollamaUrl, setOllamaUrl,
        normalChatHistory, tutorChatHistory, setNormalChatHistory, setTutorChatHistory,
        tutorSessionState, updateTutorSessionState, completeTutorSession, pastTutorSessions, toggleMindDump,
        showNodeBadge, setShowNodeBadge, chumToasts, addTask, isPremiumUser, aiPrimaryNode, setAIPrimaryNode, activeFramework,
        tasks, triggerChumToast
    } = useStudyStore();

    const [widgetPos, setWidgetPos] = useState({ isLeft: false, isTop: false });

    const currentHistory = isTutorModeActive ? tutorChatHistory : normalChatHistory;
    const setCurrentHistory = isTutorModeActive ? setTutorChatHistory : setNormalChatHistory;

    const isFlowState = activeMode === "flowState";
    const activeShard = shards.find(s => s.id === activeShardId);

    const [showTaskForm, setShowTaskForm] = useState(false);
    const [newTask, setNewTask] = useState<{ title: string, description: string, load: TaskLoad, deadline?: string, estimatedPomos?: number, isFrog?: boolean }>({ title: "", description: "", load: "medium", isFrog: false });
    const [isScheduled, setIsScheduled] = useState(false);

    // Chum Petting State
    const [petHearts, setPetHearts] = useState<{ id: number, x: number }[]>([]);
    const petCounter = useRef(0);
    const [chumScale, setChumScale] = useState(1);
    
    const handlePetChum = (e: React.MouseEvent) => {
        e.stopPropagation();
        petCounter.current += 1;
        setPetHearts(prev => [...prev, { id: petCounter.current, x: (Math.random() - 0.5) * 40 }]);
        
        // Physical Squish/Jump
        setChumScale(0.8);
        setTimeout(() => setChumScale(1.15), 100);
        setTimeout(() => setChumScale(1.0), 300);

        setTimeout(() => {
            setPetHearts(prev => prev.filter(p => p.id !== petCounter.current));
        }, 800);
    };

    // 🌐 WEB PUSH (Mock Support)
    const sendPush = (title: string, body: string) => {
        const BrowserNotification = (window as any).Notification;
        if (BrowserNotification && BrowserNotification.permission === "granted") {
            new BrowserNotification("StudyBuddy", {
                body: body,
                icon: "/assets/favicon.png"
            });
        }
    };

    useEffect(() => {
        const BrowserNotification = (window as any).Notification;
        if (BrowserNotification && BrowserNotification.permission === "default") {
            BrowserNotification.requestPermission();
        }
    }, []);


    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentHistory, isOpen, showSettings, showSessions]);
    useEffect(() => { if (isTutorModeActive) setIsOpen(true); }, [isTutorModeActive]);

    const historyLengthRef = useRef(currentHistory.length);


    // 2. The Smart Message Listener
    useEffect(() => {
        // Only trigger if the history ACTUALLY got longer
        const isNewMessage = currentHistory.length > historyLengthRef.current;
        historyLengthRef.current = currentHistory.length;

        const lastMsg = currentHistory[currentHistory.length - 1];

        if (isNewMessage && lastMsg?.role === 'chum' && !isOpen) {
            setShowBubble(true);
            if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
            bubbleTimeoutRef.current = setTimeout(() => setShowBubble(false), 8000);
        }
    }, [currentHistory, isOpen]);

    // 3. The Global Kill Switch
    useEffect(() => {
        if (isOpen) {
            setShowBubble(false); // Always hide the floating hover bubble

            // If system toasts fire WHILE the chat is open, route them inside as ephemeral messages!
            if (chumToasts && chumToasts.length > 0) {
                const toast = chumToasts[0];
                setEphemeralMsg({
                    text: toast.message,
                    type: toast.type || 'info',
                    id: Date.now()
                });

                // 🔔 Trigger Web Push if applicable (only send if message is a string)
                if (typeof toast.message === 'string') {
                    sendPush("Chum Guidance", toast.message.replace(/<[^>]*>?/gm, ''));
                }

                // Remove it from the store queue since we're displaying it internally
                useStudyStore.setState((state) => ({
                    chumToasts: state.chumToasts.filter((t: ChumToast) => t.id !== toast.id)
                }));
            }
        }
    }, [isOpen, chumToasts]); // Now listens to chumToasts queue updates!

    const handleToggleSchedule = (checked: boolean) => {
        setIsScheduled(checked);
        if (checked && !newTask.deadline) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask({ ...newTask, deadline: now.toISOString().slice(0, 16) });
        } else if (!checked) {
            setNewTask({ ...newTask, deadline: undefined });
        }
    };

    useLayoutEffect(() => {
        if (showTaskForm) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask(prev => ({ ...prev, deadline: now.toISOString().slice(0, 16) }));
            setIsScheduled(true);
        }
    }, [showTaskForm]);

    const handlePlantQuest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        const activeQuests = (tasks || []).filter((t: any) => !t.isCompleted);
        const heavyCount = activeQuests.filter((t: any) => t.load === 'heavy').length;

        // 1. Burnout Hard Stop
        if (newTask.load === 'heavy' && heavyCount >= 2) {
            triggerChumToast?.(
                <span><strong className="text-red-400">Burnout Risk Detected! ⚠️</strong><br />You already have {heavyCount} Heavy tasks today. Adding more severely reduces focus. Try breaking this into Medium tasks.</span>,
                'warning'
            );
            return;
        }

        // 2. Soft Limits for 1-3-5 Mode
        if (activeFramework === '1-3-5') {
            const mediumCount = activeQuests.filter((t: any) => t.load === 'medium').length;
            const lightCount = activeQuests.filter((t: any) => t.load === 'light').length;

            if (newTask.load === 'medium' && mediumCount >= 3) {
                triggerChumToast?.("You're loading up! Usually we keep it to 3 medium tasks in this framework.", 'info');
            } else if (newTask.load === 'light' && lightCount >= 5) {
                triggerChumToast?.("That's a lot of small plants! Try to stay under 5 light tasks.", 'info');
            }
        }

        addTask({ ...newTask, deadline: isScheduled ? newTask.deadline : undefined });
        setShowTaskForm(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: undefined, isFrog: false });
        setIsScheduled(false);
    };

    const handleSendMessage = async (e?: React.FormEvent, forcePrimer = false) => {
        if (e) e.preventDefault();

        const messageText = forcePrimer ? "Let's start our session! I'm ready for the first question." : inputText;
        if (!messageText.trim()) return;

        const newHistory = [...currentHistory, { role: 'user' as const, text: messageText }];
        setCurrentHistory(newHistory);
        if (!forcePrimer) setInputText("");
        setIsTyping(true);

        if (isTutorModeActive && tutorSessionState.isSessionComplete) {
            setIsTyping(false);
            exitTutorMode();
            return;
        }

        if (showExitConfirm) {
            const text = messageText.toLowerCase();
            if (text.includes("yes") || text.includes("leave") || text.includes("quit") || text.includes("exit")) {
                exitMode();
                setShowExitConfirm(false);
                setIsTyping(false);
                return;
            } else {
                setShowExitConfirm(false);
                setCurrentHistory([...newHistory, { role: 'chum', text: "Glad you're staying! Let's keep that focus high." }]);
                setIsTyping(false);
                return;
            }
        }

        if (isFlowState && ["leave", "quit", "exit", "done"].some(k => messageText.toLowerCase().includes(k))) {
            setShowExitConfirm(true);
            setCurrentHistory([...newHistory, { role: 'chum', text: "Are you sure you want to leave your FlowState? You're doing great." }]);
            setIsTyping(false);
            return;
        }

        let systemPrompt = "";
        if (isTutorModeActive && activeShard) {
            const truncatedContent = activeShard.content.length > 12000 ? activeShard.content.slice(0, 12000) + "\n...[Content truncated for AI token limits]" : activeShard.content;
            const totalContent = `Base Notes: ${truncatedContent}`;
            const shardHistory = pastTutorSessions.filter(s => s.shardId === activeShard.id).slice(-1);
            const historySummary = shardHistory.map(s => {
                const pastQA = s.history
                    .filter(m => m.role === 'chum' && m.text.includes('?'))
                    .map(m => `- ${m.text.substring(0, 100).replace(/\n/g, ' ')}...`)
                    .join('\n');
                return `--- Last Session ---\n${pastQA}`;
            }).join("\n\n") || "No previous sessions recorded.";

            systemPrompt = `You are Chum, a cozy lo-fi tutor AI. 
            FIRST PERSON. COZY. NO FORMAL QUOTATIONS.
            
            Your goal is to test the user's knowledge on: "${activeShard.title}".
            KNOWLEDGE BASE:
            ${totalContent}

            SESSION CONTEXT:
            Current Question: #${tutorSessionState.questionIndex + 1}
            Preferred Question Type: ${tutorSessionState.preferredType}
            Is this the very start (Primer)? ${forcePrimer ? 'YES' : 'NO'}
            
            PAST SESSIONS FOR THIS SHARD:
            ${historySummary}
            STRICTLY DO NOT REPEAT QUESTIONS FROM PAST SESSIONS.

            AI INSTRUCTION:
            1. Every time the user responds with an answer, check their validity against the KNOWLEDGE BASE. 
            2. If CORRECT, start your response with "CORRECT! [short explanation]".
            3. If WRONG, explain the right answer, starting with "Not quite! [short explanation]".
            4. ALWAYS state the question number clearly at the start of your question (e.g., "Question #2: ...").
            5. Ask exactly 3 questions in total. ONLY SEND ONE QUESTION AT A TIME.
            6. Stick STRICTLY to the preferred type: ${tutorSessionState.preferredType}.
            7. If this is the start (Question #1) and the user says "Let's start", DO NOT evaluate them. Greet them and ask Question #1.
            8. Only wrap up the session AFTER you have evaluated Question #3.
            9. EXTREMELY IMPORTANT: BE VERY CONCISE. NEVER write long paragraphs. Your explanations MUST be short (1-2 sentences max). Massive generation wastes tokens and causes API failures! Keep it snappy!`;
        } else {
            systemPrompt = `You are Chum, a cozy lo-fi AI study companion.
            FIRST PERSON VIEW ONLY. NO QUOTATIONS AT ALL.
            YOU ARE COZY, LO-FI, AND SUPPORTIVE.
            KEEP RESPONSES CONCISE AND CONVERSATIONAL.
            NEVER USE QUOTATION MARKS IN YOUR OUTPUT.
            YOUR CATCHPHRASES: stay hydrated, keep focus, proud of you.`;
        }

        let aiResponse = "";
        let usedNode = "";

        // --- CLOUD CHAT ENGINE ---
        const tryCloudChat = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const activeHistory = isTutorModeActive ? tutorChatHistory : normalChatHistory;
            const historyToSend = activeHistory
                .filter(msg => msg.text && msg.text.trim().length > 0)
                .map(msg => ({
                    role: msg.role === 'chum' ? 'assistant' : 'user',
                    content: msg.text
                }));

            const messagesPayload = [
                { role: "system", content: systemPrompt },
                ...historyToSend,
                { role: "user", content: messageText }
            ];

            try {
                const chatUrl = getChatUrl();
                const res = await fetch(chatUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: messagesPayload,
                        user_id: session?.user.id,
                        selected_model: useStudyStore.getState().selectedModel,
                        primary_node: useStudyStore.getState().aiPrimaryNode,
                        openrouter_key: useStudyStore.getState().aiKeys.openrouter,
                        groq_key: useStudyStore.getState().aiKeys.groq,
                        gemini_key: useStudyStore.getState().aiKeys.gemini,
                        stream: false
                    })
                });

                const contentType = res.headers.get('content-type') || "";
                if (!res.ok) {
                    if (contentType.includes('text/html')) {
                        throw new Error("Neural link reached an error page (HTML). The backend service might be unavailable or you might be behind a login wall.");
                    }
                    const errorData = await res.json().catch(() => ({}));
                    const errorMsg = errorData.error || `Neural link failed (Status ${res.status}).`;
                    throw new Error(errorMsg);
                }

                usedNode = res.headers.get('X-Node-Used') || "Cloud Node";
                setCurrentHistory([...newHistory, { role: 'chum', text: "", node: usedNode }]);

                if (contentType.includes('application/json')) {
                    const data = await res.json().catch(() => ({}));
                    if (data.success === false || data.error) {
                        throw new Error(data.error || "Neural link returned a failure status.");
                    }
                    const aiText = data.response || data.text || "";
                    aiResponse = aiText;
                    
                    // Simulate smooth typewriter streaming
                    let currentText = "";
                    const chunkSize = Math.max(1, Math.floor(aiText.length / 30));
                    for (let i = 0; i < aiText.length; i += chunkSize) {
                        currentText += aiText.substring(i, i + chunkSize);
                        setCurrentHistory((prev: ChatMessage[]) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = { ...updated[updated.length - 1], text: currentText };
                            return updated;
                        });
                        await new Promise(r => setTimeout(r, 20));
                    }
                    setCurrentHistory((prev: ChatMessage[]) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], text: aiText };
                        return updated;
                    });
                    return true;
                }

                if (!res.body) throw new Error("No neural stream received.");

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const textChunk = decoder.decode(value, { stream: true });
                    
                    // Safety check: if the very first chunk looks like HTML, abort immediately
                    if (fullText === "" && (textChunk.trim().startsWith('<!DOCTYPE') || textChunk.trim().startsWith('<html'))) {
                        throw new Error("Neural link returned incompatible format (HTML). Check your API keys.");
                    }

                    fullText += textChunk;
                    setCurrentHistory((prev: ChatMessage[]) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], text: fullText };
                        return updated;
                    });
                }
                aiResponse = fullText;
                return true;
            } catch (e: unknown) {
                const err = e as Error;
                console.error("[CHUM] Cloud Chat Error:", err.message);
                throw err;
            }
        };

        let lastErrorMessage = "";
        try {
            if (aiTier === 'offline') throw new Error("Offline mode");

            if (aiTier === 'cloud') {
                setIsTyping(true);
                await tryCloudChat();
                setIsTyping(false);
            } else if (aiTier === 'local') {
                try {
                    setIsTyping(true);
                    const historyToUse = [...(isTutorModeActive ? tutorChatHistory : normalChatHistory), { role: 'user' as const, text: messageText }].map(msg => ({
                        role: msg.role === 'chum' ? 'assistant' : 'user',
                        content: msg.text
                    }));

                    const res = await fetch(`${ollamaUrl}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: "llama3.2:1b",
                            messages: [{ role: "system", content: systemPrompt }, ...historyToUse],
                            stream: false
                        })
                    });
                    const data = await res.json();
                    aiResponse = data.message.content;
                    usedNode = "Local Hive (Ollama)";
                    setIsTyping(false);
                    setCurrentHistory([...newHistory, { role: 'chum', text: aiResponse, node: usedNode }]);
                } catch (e) {
                    setIsTyping(false);
                    setCurrentHistory([...newHistory, { role: 'chum', text: "Neural link failed. If using Ollama, ensure it is running and CORS is allowed.", node: "Fallback" }]);
                }
            }
        } catch (err: unknown) {
            const e = err as Error;
            setIsTyping(false);
            setCurrentHistory([...newHistory, { role: 'chum', text: e.message || "Neural link failed.", node: "Error" }]);
        }

        if (isTutorModeActive && activeShard && !forcePrimer) {
            const responseUpper = aiResponse.toUpperCase();
            const isCorrect = responseUpper.includes("CORRECT!");
            const isIncorrect = responseUpper.includes("NOT QUITE") || responseUpper.includes("WRONG");

            if (isCorrect || isIncorrect) {
                const newIndex = tutorSessionState.questionIndex + 1;
                const currentGain = isCorrect ? 8 : 0;
                const totalSessionMastery = (tutorSessionState.totalMasteryGained || 0) + currentGain;

                updateShardMastery(activeShard.id, currentGain);
                updateTutorSessionState({
                    questionIndex: newIndex,
                    totalMasteryGained: totalSessionMastery
                });

                const updatedShard = useStudyStore.getState().shards.find(s => s.id === activeShard.id);
                const hasReachedMax = updatedShard && updatedShard.mastery >= 100;

                if (newIndex >= 3 || hasReachedMax) {
                    completeTutorSession(totalSessionMastery);

                    setTimeout(() => {
                        const completionMsg = hasReachedMax
                            ? "Incredible! Mastery reached 100%. This chapter is now part of your permanent knowledge. 🌟"
                            : "Session complete! Check your Neural Archives to see your progress.";

                        setCurrentHistory((prev: ChatMessage[]) => [
                            ...prev,
                            { role: 'chum', text: completionMsg }
                        ]);
                    }, 600);
                }
            }
        }
    };

    useEffect(() => {
        if (isTutorModeActive && tutorChatHistory.length === 0 && !isTyping) {
            handleSendMessage(undefined, true);
        }
    }, [isTutorModeActive]);

    let themeColor = "var(--accent-teal)";
    let title = "Chum";
    if (isFlowState) themeColor = "var(--text-muted)";
    else if (isTutorModeActive) { themeColor = "var(--accent-yellow)"; title = "Chum (Tutor)"; }

    const AITierIcon = aiTier === 'cloud' ? Network : aiTier === 'local' ? Cpu : WifiOff;

    // --- SMART POSITIONING CALCULATIONS ---
    // Pushes bubble slightly higher than center (bottom-24) or flips it down if at top (top-16)
    const bubbleYPos = widgetPos.isTop ? 'top-[12px] sm:top-[16px]' : 'bottom-[20px] sm:bottom-[24px]';
    const bubbleXPos = widgetPos.isLeft ? 'left-[60px] sm:left-[76px]' : 'right-[60px] sm:right-[76px]';

    // Flips the Instagram tail corner based on exactly which quadrant it's in
    const tailCorner = widgetPos.isTop
        ? (widgetPos.isLeft ? 'rounded-tl-[4px] origin-top-left' : 'rounded-tr-[4px] origin-top-right')
        : (widgetPos.isLeft ? 'rounded-bl-[4px] origin-bottom-left' : 'rounded-br-[4px] origin-bottom-right');

    // Flips the Chatbox anchor so it drops down if dragged to the top of the screen
    const chatboxYPos = widgetPos.isTop ? 'top-[80px]' : 'bottom-[80px]';
    const chatboxOrigin = widgetPos.isTop
        ? (widgetPos.isLeft ? 'left-0 origin-top-left' : 'right-0 origin-top-right')
        : (widgetPos.isLeft ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right');
    // --------------------------------------

    return (
        <>
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
                onDragEnd={(e, info) => setWidgetPos({
                    isLeft: info.point.x < window.innerWidth / 2,
                    isTop: info.point.y < window.innerHeight / 3 // Flips if in the top 33% of screen
                })}
                style={{ zIndex: 100000 }}
                className="fixed bottom-8 right-8 flex flex-col items-end justify-end cursor-grab active:cursor-grabbing"
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            // 👇 Removed the 'y' translations that were throwing it off-screen!
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`absolute ${chatboxYPos} ${chatboxOrigin} w-[min(340px,90vw)] sm:w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden cursor-default flex flex-col`}
                            style={{ height: '480px' }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-(--bg-sidebar) border-b border-(--border-color) p-3 flex justify-between items-center relative overflow-hidden">
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 40%, transparent)` }}>
                                        {isTutorModeActive ? <BrainCircuit size={16} color={themeColor} /> : <ChumRenderer size="w-8 h-8 scale-150" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-(--text-main) text-sm">{title}</span>
                                        </div>
                                        {!isFlowState && (
                                            <span className="text-[9px] text-(--text-muted) flex items-center gap-1 mt-0.5 cursor-pointer hover:text-(--accent-teal)" onClick={() => setShowSettings(!showSettings)}>
                                                <AITierIcon size={10} /> {aiTier.toUpperCase()} NODE <Settings size={10} className="ml-1" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    <button onClick={() => setIsOpen(false)} className="text-(--text-muted) hover:text-(--text-main) transition-colors"><X size={16} /></button>
                                </div>
                            </div>

                            {showSettings && !isFlowState ? (
                                <div className="flex-1 p-4 bg-(--bg-dark) overflow-y-auto custom-scrollbar flex flex-col gap-5">
                                    <div className="flex justify-between items-center bg-(--bg-card) border border-(--border-color) rounded-xl p-3 mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-(--accent-teal) tracking-widest">Waterfall Active</span>
                                            <span className="text-[9px] text-(--text-muted) italic">OpenRouter → Groq → Gemini</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {['openrouter', 'groq', 'gemini'].map((provider) => (
                                                <div key={provider} className={`w-1.5 h-1.5 rounded-full ${aiPrimaryNode === provider ? 'bg-(--accent-teal)' : 'bg-(--text-muted)/20'}`} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex bg-(--bg-sidebar) p-1 rounded-lg border border-(--border-color)">
                                        {(['cloud', 'local', 'offline'] as const).map(tier => (
                                            <button key={tier} onClick={() => setAITier(tier)} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${aiTier === tier ? 'bg-(--accent-teal) text-white' : 'text-(--text-muted) hover:text-(--text-main)'}`}>{tier}</button>
                                        ))}
                                    </div>

                                    {aiTier === 'cloud' && (
                                        <>
                                            <div className="bg-(--bg-card) border border-(--border-color) rounded-lg p-2 flex flex-col gap-1">
                                                <div className="flex justify-between items-center mb-1 px-1">
                                                    <span className="text-[10px] font-black text-(--accent-teal) uppercase tracking-tighter">Waterfall Sequence</span>
                                                    <span className="text-[9px] text-(--text-muted) italic">Drag not yet supported</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[aiPrimaryNode, ...(['openrouter', 'groq', 'gemini'].filter(n => n !== aiPrimaryNode))].map((node, i) => (
                                                        <div key={node} className="flex items-center gap-1">
                                                            <div className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${i === 0 ? 'bg-(--accent-teal)/10 border-(--accent-teal) text-(--accent-teal)' : 'bg-(--bg-dark) border-(--border-color) text-(--text-muted)'}`}>
                                                                {node.toUpperCase()}
                                                            </div>
                                                            {i < 2 && <span className="text-(--text-muted) text-[10px]">→</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-5">
                                                {[
                                                    {
                                                        id: 'openrouter',
                                                        label: 'OpenRouter',
                                                        placeholder: 'sk-or-v1-...',
                                                        models: [
                                                            { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B Instruct v0.3' },
                                                            { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                                                            { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B Instruct' }
                                                        ]
                                                    },
                                                    {
                                                        id: 'groq',
                                                        label: 'Groq',
                                                        placeholder: 'gsk_...',
                                                        models: [
                                                            { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70b' },
                                                            { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8b' }
                                                        ]
                                                    },
                                                    {
                                                        id: 'gemini',
                                                        label: 'Gemini (Direct)',
                                                        placeholder: 'AIza...',
                                                        models: [
                                                            { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
                                                            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
                                                        ]
                                                    }
                                                ].map((prov) => (
                                                    <div key={prov.id} className={`space-y-2 p-3 rounded-xl bg-[var(--bg-dark)]/50 border transition-colors ${aiPrimaryNode === prov.id ? 'border-(--accent-teal)' : 'border-(--border-color)'}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-[var(--accent-teal)] uppercase tracking-widest">{prov.label}</span>
                                                                {aiPrimaryNode !== prov.id && (
                                                                    <button onClick={() => setAIPrimaryNode(prov.id as any)} className="text-[9px] bg-(--accent-teal)/10 text-(--accent-teal) px-1.5 py-0.5 rounded-md border border-(--accent-teal)/30 hover:bg-(--accent-teal)/20 transition-colors uppercase font-black">Set Primary</button>
                                                                )}
                                                                {aiPrimaryNode === prov.id && (
                                                                    <span className="text-[9px] bg-(--accent-teal) text-black px-1.5 py-0.5 rounded-md font-black uppercase">Active</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-[var(--text-muted)]">Model:</span>
                                                                <select
                                                                    value={selectedModel || ''}
                                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                                    className="bg-transparent text-[10px] font-bold text-[var(--text-main)] outline-none cursor-pointer border-b border-[var(--border-color)] pb-0.5"
                                                                    disabled={!aiKeys[prov.id as keyof typeof aiKeys]}
                                                                >
                                                                    <option value="" disabled className="bg-[var(--bg-card)]">Select Model</option>
                                                                    {prov.models.map(m => (
                                                                        <option key={m.id} value={m.id} className="bg-[var(--bg-card)]">{m.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="password"
                                                            value={aiKeys[prov.id as keyof typeof aiKeys] || ''}
                                                            onChange={(e) => updateAIKeys({ [prov.id]: e.target.value })}
                                                            placeholder={prov.placeholder}
                                                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] placeholder:text-[var(--text-muted)]/30"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {aiTier === 'local' && (
                                        <div className="flex flex-col gap-3">
                                            <label className="text-xs text-(--text-muted) font-bold">Ollama Endpoint URL</label>
                                            <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="w-full bg-(--bg-card) border border-(--border-color) rounded-lg px-4 py-2 text-xs text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between bg-(--bg-card) border border-(--border-color) rounded-lg p-3">
                                        <span className="text-xs font-bold text-(--text-main)">Show Model Badge</span>
                                        <div onClick={() => setShowNodeBadge(!showNodeBadge)} className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${showNodeBadge ? 'bg-(--accent-teal)' : 'bg-(--bg-sidebar) border border-(--border-color)'}`}>
                                                <div className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${showNodeBadge ? 'translate-x-4 bg-[#0b1211]' : 'translate-x-0 bg-(--text-muted)'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowSettings(false)} className="mt-auto w-full py-2 bg-(--bg-sidebar) border border-(--border-color) rounded-lg text-xs font-bold text-(--text-main) hover:border-(--accent-teal) transition-colors">Save & Close</button>
                                </div>

                            ) : showQuickArchive ? (
                                <div className="flex-1 p-4 bg-(--bg-dark) overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-bold text-(--text-main)">
                                            {readingShard ? "Reading Note" : "Quick Archive"}
                                        </h3>
                                        {readingShard && (
                                            <button onClick={() => setReadingShard(null)} className="text-xs text-(--accent-teal) hover:underline">Back</button>
                                        )}
                                    </div>
                                    {readingShard ? (
                                        <div className="bg-(--bg-card) border border-(--border-color) rounded-xl p-4 text-xs text-(--text-main) leading-relaxed whitespace-pre-wrap shadow-inner">
                                            <h4 className="font-bold mb-3 text-sm border-b border-(--border-color) pb-2">{readingShard.title}</h4>
                                            {readingShard.content || "No text content available."}
                                        </div>
                                    ) : shards.length === 0 ? (
                                        <p className="text-xs text-(--text-muted) italic text-center mt-10">No shards forged yet.</p>
                                    ) : (
                                        shards.map(shard => (
                                            <div key={shard.id} onClick={() => setReadingShard(shard)} className="bg-(--bg-card) border border-(--border-color) rounded-xl p-3 flex justify-between items-center shadow-sm cursor-pointer hover:border-(--accent-teal) transition-colors">
                                                <span className="text-[11px] font-bold text-(--text-main) truncate max-w-[200px]">{shard.title}</span>
                                                <span className="text-[9px] text-(--accent-teal) font-bold">{shard.mastery}%</span>
                                            </div>
                                        ))
                                    )}
                                    <button onClick={() => { setShowQuickArchive(false); setReadingShard(null); }} className="mt-auto w-full py-2 bg-(--bg-sidebar) border border-(--border-color) rounded-lg text-xs font-bold text-(--text-main) hover:border-(--accent-teal) transition-colors">Back to Chat</button>
                                </div>

                            ) : showSessions && !isFlowState ? (
                                <div className="flex-1 p-4 bg-(--bg-dark) overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    <h3 className="text-sm font-bold text-(--text-main) mb-2">Neural Archives</h3>
                                    {pastTutorSessions.length === 0 ? (
                                        <p className="text-xs text-(--text-muted) italic text-center mt-10">No past sessions recorded.</p>
                                    ) : (
                                        pastTutorSessions.map(session => (
                                            <div key={session.id} className="bg-(--bg-card) border border-(--border-color) rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-(--text-main)">{session.shardTitle}</span>
                                                    <span className="text-[9px] text-(--text-muted)">{new Date(session.date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-(--accent-teal) font-bold">+{session.masteryGained}% Mastery</span>
                                                    <button onClick={() => { setViewingLog(session); }} className="text-[9px] bg-(--bg-sidebar) px-2 py-1 rounded border border-(--border-color) text-(--text-muted) hover:text-(--text-main)">View Logs</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <button onClick={() => setShowSessions(false)} className="mt-auto w-full py-2 bg-(--bg-sidebar) border border-(--border-color) rounded-lg text-xs font-bold text-(--text-main) hover:border-(--accent-teal)">Back to Link</button>
                                </div>

                            ) : (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                                        {isTutorModeActive && (
                                            <div className="sticky top-0 z-20 flex justify-center py-2 pointer-events-none">
                                                <div className="bg-(--bg-card)/80 backdrop-blur-md border border-(--accent-yellow)/20 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-3">
                                                    <div className="h-1.5 w-24 bg-(--bg-dark) rounded-full overflow-hidden">
                                                        <div className="h-full bg-(--accent-yellow) transition-all duration-500" style={{ width: `${activeShard?.mastery}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-(--accent-yellow) uppercase tracking-wider">{activeShard?.mastery}% Mastery</span>
                                                </div>
                                            </div>
                                        )}

                                        {currentHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} flex-col`}>
                                                <div className={`p-3 text-sm rounded-xl max-w-[85%] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-(--accent-teal)/20 border border-(--accent-teal)/30 text-(--text-main) rounded-tr-none' : 'bg-(--bg-dark) border border-(--border-color) text-(--text-muted) rounded-tl-none'}`}>
                                                    {msg.text}

                                                    {msg.node && msg.role === 'chum' && showNodeBadge && (
                                                        <div className="mt-2 pt-2 border-t border-(--border-color)/30 flex items-center gap-1.5 opacity-50 select-none">
                                                            <Cpu size={10} className="text-(--accent-teal)" />
                                                            <span className="text-[9px] font-mono tracking-tighter uppercase">{msg.node}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {showExitConfirm && i === currentHistory.length - 1 && msg.role === 'chum' && msg.text.includes("leave") && (
                                                    <div className="flex gap-2 mt-2 ml-1">
                                                        <button onClick={() => { exitMode(); setShowExitConfirm(false); }} className="text-[10px] font-bold bg-red-400/10 text-red-400 px-3 py-1.5 rounded border border-red-400/20 hover:bg-red-400 hover:text-white transition-all">Yes, Leave</button>
                                                        <button onClick={() => setShowExitConfirm(false)} className="text-[10px] font-bold bg-(--accent-teal)/10 text-(--accent-teal) px-3 py-1.5 rounded border border-(--accent-teal)/20 hover:bg-(--accent-teal) hover:text-white transition-all">Stay</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <AnimatePresence>
                                            {ephemeralMsg && (
                                                <motion.div
                                                    key={ephemeralMsg.id}
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    // The Flashy Disappear: It scales up slightly, blurs, and fades out
                                                    exit={{ opacity: 0, scale: 1.05, filter: "brightness(1.5) blur(4px)", transition: { duration: 0.3 } }}
                                                    className="flex justify-start flex-col mt-2 overflow-hidden"
                                                >
                                                    <div className={`relative p-4 text-sm max-w-[85%] shadow-md whitespace-pre-wrap rounded-2xl rounded-tl-none overflow-hidden ${ephemeralMsg.type === 'warning' ? 'bg-red-500/10 border border-red-500/30 text-red-200' :
                                                        ephemeralMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                                                            ephemeralMsg.type === 'info' ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400' :
                                                                'bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/30 text-[var(--accent-teal)]'
                                                        }`}>

                                                        <div className="flex items-center gap-1.5 mb-2 opacity-70">
                                                            <span className="text-[10px] font-black uppercase tracking-wider">
                                                                {ephemeralMsg.type === 'warning' ? '⚠️ System Alert' : ephemeralMsg.type === 'success' ? '✨ Celebration' : ephemeralMsg.type === 'info' ? 'ℹ️ Guidance' : '🔔 Chum Alert'}
                                                            </span>
                                                        </div>

                                                        {/* This allows ReactNode rendering so your bold burnout texts work perfectly */}
                                                        <div className="leading-relaxed font-medium pb-2">
                                                            {ephemeralMsg.text}
                                                        </div>

                                                        {/* The Decay Progress Bar Container */}
                                                        <div className="absolute bottom-0 left-0 h-1.5 bg-black/20 w-full">
                                                            {/* The Animated Bar */}
                                                            <motion.div
                                                                initial={{ width: "100%" }}
                                                                animate={{ width: "0%" }}
                                                                // Adjust this duration (in seconds) to make it stay longer/shorter
                                                                transition={{ duration: 8, ease: "linear" }}
                                                                // Triggers the flashy exit the exact millisecond the bar hits 0
                                                                onAnimationComplete={() => setEphemeralMsg(null)}
                                                                className={`h-full shadow-[0_0_10px_currentColor] ${ephemeralMsg.type === 'warning' ? 'bg-red-500 text-red-500' :
                                                                    ephemeralMsg.type === 'success' ? 'bg-emerald-500 text-emerald-500' :
                                                                        ephemeralMsg.type === 'info' ? 'bg-sky-500 text-sky-500' :
                                                                            'bg-[var(--accent-teal)] text-[var(--accent-teal)]'
                                                                    }`}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {/* 👆 END EPHEMERAL MESSAGE 👆 */}

                                        {isTyping && <div className="text-xs text-[var(--text-muted)] animate-pulse">Chum is thinking...</div>}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* QUICK ACTIONS */}
                                    <div className="px-3 py-2 border-t border-(--border-color) bg-(--bg-sidebar)/50 flex flex-wrap items-center gap-2">
                                        {isTutorModeActive ? (
                                            <button onClick={exitTutorMode} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5">
                                                <LogOut size={12} /> Abort Training
                                            </button>
                                        ) : isFlowState ? (
                                            <>
                                                <button onClick={() => setShowQuickArchive(true)} className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                                <button onClick={toggleMindDump} className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5"><Edit3 size={12} /> Mind-dump pad</button>
                                                <button onClick={() => setShowExitConfirm(true)} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"><LogOut size={12} /> Leave</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setShowTaskForm(true)} className="text-[10px] font-bold text-(--accent-teal) px-3 py-1.5 rounded-lg border border-(--accent-teal)/20 hover:bg-(--accent-teal)/10 flex items-center gap-1.5"><Plus size={12} /> Pen a Chapter</button>
                                                <button onClick={() => setShowQuickArchive(true)} className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                                <button onClick={() => setShowSessions(true)} className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5"><History size={12} /> Neural Archives</button>
                                            </>
                                        )}
                                    </div>

                                    <form onSubmit={handleSendMessage} className="p-3 border-t border-(--border-color) bg-(--bg-sidebar) flex gap-2">
                                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} placeholder={isTutorModeActive ? (tutorSessionState.isSessionComplete ? "Type anything to finish..." : "Answer here...") : isFlowState ? "Speak to Chum or ask to leave..." : "Message Chum..."} className="flex-1 bg-(--bg-dark) border border-(--border-color) rounded-xl px-3 py-2 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) transition-colors placeholder:text-(--text-muted)/50 disabled:opacity-50" />
                                        <button type="submit" disabled={!inputText.trim() || isTyping} className="rounded-xl w-10 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, color: themeColor, border: `1px solid color-mix(in srgb, ${themeColor} 30%, transparent)` }}><Send size={16} /></button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🗣️ CHUM FLOATING BUBBLES (Stacking!) */}
                <div className={`absolute ${bubbleXPos} ${bubbleYPos} flex flex-col-reverse gap-3 items-end pointer-events-none`}>
                    <AnimatePresence>
                        {/* 1. System Toasts (Stacked) */}
                        {!isOpen && (chumToasts as ChumToast[])?.length > 0 && (chumToasts as ChumToast[])?.map((toast, idx) => (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, scale: 0.5, y: 50, x: widgetPos.isLeft ? -30 : 30, rotate: widgetPos.isLeft ? -15 : 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
                                whileHover={{ scale: 1.02, rotate: 0.5 }}
                                transition={{ type: "spring", stiffness: 600, damping: 25, mass: 0.6 }}
                                exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)", transition: { duration: 0.1 } }}
                                style={{
                                    zIndex: 100 - idx
                                }}
                                onClick={() => {
                                    if (toast.action) {
                                        toast.action();
                                        useStudyStore.setState((state) => ({
                                            chumToasts: state.chumToasts.filter((t: ChumToast) => t.id !== toast.id)
                                        }));
                                    } else {
                                        setIsOpen(true);
                                    }
                                }}
                                className={`w-[min(280px,75vw)] sm:w-[min(320px,90vw)] min-h-[60px] bg-[var(--bg-card)]/95 backdrop-blur-xl border-2 p-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer pointer-events-auto flex flex-col justify-center relative ${toast.type === 'warning' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' :
                                    toast.type === 'success' ? 'border-emerald-500/40 shadow-[0_0_20_rgba(16,185,129,0.1)]' :
                                        toast.type === 'info' ? 'border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.1)]' :
                                            'border-[var(--border-color)]'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${toast.type === 'warning' ? 'text-red-400' :
                                        toast.type === 'success' ? 'text-emerald-400' :
                                            toast.type === 'info' ? 'text-sky-400' :
                                                'text-[var(--accent-teal)]'
                                        }`}>
                                        {toast.type === 'warning' ? 'Neural Warning' : toast.type === 'success' ? 'Mastery Pulse' : 'Guidance Shard'}
                                    </p>
                                    <Sparkles size={10} className={toast.type === 'warning' ? 'text-red-400' : 'text-(--accent-yellow)'} />
                                </div>
                                <div className="text-sm text-[var(--text-main)] leading-relaxed font-bold">
                                    {toast.message}
                                </div>
                                {idx === 0 && (
                                    <div className={`absolute w-5 h-5 bg-[var(--bg-card)] z-[-1] -bottom-[10px] rounded-full shadow-md ${widgetPos.isLeft ? 'left-10' : 'right-10'}`} />
                                )}
                            </motion.div>
                        ))}

                        {/* 2. Last Chat Message (Only if no active toasts) */}
                        {showBubble && !isOpen && (!chumToasts || chumToasts.length === 0) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 450, damping: 12 }}
                                exit={{ opacity: 0, scale: 0 }}
                                style={{ rotate: '1deg' }}
                                onClick={() => setIsOpen(true)}
                                className="w-[min(280px,75vw)] sm:w-[min(320px,90vw)] min-h-[60px] bg-[var(--bg-card)]/95 backdrop-blur-xl border-2 border-[var(--border-color)] p-4 rounded-[28px] shadow-[0_15px_40px_rgba(0,0,0,0.4)] cursor-pointer pointer-events-auto flex flex-col justify-center hover:border-[var(--accent-teal)] transition-colors relative"
                            >
                                <p className="text-sm text-[var(--text-main)] leading-relaxed font-bold line-clamp-2">
                                    {currentHistory[currentHistory.length - 1]?.text}
                                </p>
                                <div className="mt-2 pt-2 border-t border-[var(--border-color)]/30 flex items-center gap-1.5 opacity-40">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--accent-teal)]">Neural Link</span>
                                </div>
                                <div className={`absolute w-4 h-4 bg-[var(--bg-card)] z-[-1] -bottom-1.5 rounded-full shadow-md ${widgetPos.isLeft ? 'left-6' : 'right-6'}`}
                                    style={{ transform: widgetPos.isLeft ? 'rotate(15deg) skew(-15deg, -15deg)' : 'rotate(45deg) skew(5deg, 5deg)' }} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button 
                    onClick={(e) => {
                        handlePetChum(e);
                        // Open slightly delayed so they enjoy the pet!
                        setTimeout(() => setIsOpen(!isOpen), 150);
                    }} 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.9 }} 
                    animate={{ scale: chumScale }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="w-16 h-16 rounded-full bg-(--bg-card) border-2 border-(--border-color) shadow-xl flex items-center justify-center relative hover:border-(--accent-teal) transition-colors overflow-visible"
                >
                    <div className="absolute inset-0 rounded-full blur-md -z-10" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}></div>
                    {isTutorModeActive ? <BrainCircuit size={28} color={themeColor} /> : <ChumRenderer size="w-14 h-14 scale-125 translate-y-1" />}
                    
                    <AnimatePresence>
                        {petHearts.map(heart => (
                            <motion.div
                                key={heart.id}
                                initial={{ opacity: 1, y: -20, x: heart.x, scale: 0 }}
                                animate={{ opacity: 0, y: -80, x: heart.x + (Math.random() - 0.5) * 20, scale: 1.5 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute text-red-500 pointer-events-none z-[1000] text-xl drop-shadow-md"
                            >
                                ❤️
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.button>
            </motion.div>

            {/* 2. LOG VIEWER MODAL */}
            <AnimatePresence>
                {viewingLog && (
                    <div className="fixed inset-0 z-100005 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingLog(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-(--bg-sidebar) border border-(--border-color) rounded-3xl w-full max-w-sm max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col cursor-default" onPointerDown={(e) => e.stopPropagation()}>

                            <div className="p-4 border-b border-(--border-color) flex justify-between items-center bg-(--bg-card)">
                                <div>
                                    <h2 className="text-sm font-bold text-(--text-main) flex items-center gap-2">
                                        <History size={14} className="text-(--accent-teal)" />
                                        {viewingLog.shardTitle}
                                    </h2>
                                    <span className="text-[10px] text-(--text-muted) font-mono">
                                        {new Date(viewingLog.date).toLocaleString()} • +{viewingLog.masteryGained}% Mastery
                                    </span>
                                </div>
                                <button onClick={() => setViewingLog(null)} className="p-1.5 rounded-md hover:bg-(--bg-dark) text-(--text-muted) hover:text-(--text-main) transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-(--bg-dark)">
                                {viewingLog.history.length === 0 ? (
                                    <p className="text-center text-(--text-muted) italic text-xs">No conversation recorded.</p>
                                ) : (
                                    viewingLog.history.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm flex flex-col gap-2 ${msg.role === 'user'
                                                ? 'bg-(--accent-teal)/20 border border-(--accent-teal)/30 text-(--text-main) rounded-tr-none'
                                                : 'bg-(--bg-card) border border-(--border-color) text-(--text-main) rounded-tl-none'
                                                }`}>
                                                {msg.text.split('\n\n').map((paragraph, pIdx) => (
                                                    <p key={pIdx} className="m-0">{paragraph}</p>
                                                ))}

                                                {msg.node && msg.role === 'chum' && showNodeBadge && (
                                                    <div className="mt-2 pt-2 border-t border-(--border-color)/30 flex items-center gap-1.5 opacity-40 select-none">
                                                        <Cpu size={10} className="text-(--accent-teal)" />
                                                        <span className="text-[9px] font-mono tracking-tighter uppercase">{msg.node}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. TASK FORM MODAL */}
            <AnimatePresence>
                {showTaskForm && (
                    <div className="fixed inset-0 z-100005 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onSubmit={handlePlantQuest} className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-2xl flex flex-col overflow-hidden"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-3">
                                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><Plus size={18} className="text-[var(--accent-teal)]" /> {isGamified ? "Seed a New Quest" : "Create New Task"}</h3>
                                <button type="button" onClick={() => setShowTaskForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-4">
                                    <input autoFocus type="text" required placeholder={isGamified ? "Quest Title" : "Task Title"} value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                    <textarea placeholder="Description..." rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] resize-none custom-scrollbar" />

                                    {/* 🐸 FROG SPECIAL */}
                                    <div
                                        onClick={() => setNewTask({ ...newTask, isFrog: !newTask.isFrog })}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${newTask.isFrog ? 'border-orange-400 bg-orange-400/10 shadow-[0_0_15px_rgba(251,146,60,0.15)]' : 'border-[var(--border-color)] bg-[var(--bg-dark)] opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Flame size={16} className={newTask.isFrog ? 'text-orange-400 animate-bounce' : 'text-[var(--text-muted)]'} />
                                            <span className={`text-xs font-black uppercase tracking-wider ${newTask.isFrog ? 'text-orange-400' : 'text-[var(--text-muted)]'}`}>This is my Frog</span>
                                        </div>
                                        <div className={`w-3.5 h-3.5 rounded-full transition-all ${newTask.isFrog ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 'bg-transparent border border-[var(--border-color)]'}`} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3">
                                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">{terms.taskLoad}</label>
                                        <div className="flex gap-2">
                                            {(['light', 'medium', 'heavy'] as const).map((weight) => (
                                                <button key={weight} type="button" onClick={() => setNewTask({ ...newTask, load: weight })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${newTask.load === weight ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)] shadow-sm' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)]'}`}>{weight}</button>
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
                                                    type="datetime-local" required value={newTask.deadline || ""} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] mt-1"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                                <SquishyButton type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-none shadow-none">Cancel</SquishyButton>
                                <SquishyButton type="submit" className="bg-[var(--accent-teal)] text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold hover:bg-teal-400 transition-colors disabled:opacity-50" disabled={!newTask.title.trim()}>{isGamified ? "Plant Seed" : "Create Task"}</SquishyButton>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
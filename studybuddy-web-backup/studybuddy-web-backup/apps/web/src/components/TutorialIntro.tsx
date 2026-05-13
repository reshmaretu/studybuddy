"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Wind, CheckCircle2, X, Globe, User, MessageSquare, Shirt, Database, Calendar, Palette, Coffee, PlayCircle, Hammer, Layout, Trophy, ShieldCheck, Cpu, Brain, SunDim, Plus, Gem, LayoutGrid, List, ListOrdered, Flame } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChumRenderer } from "@studybuddy/ui";

interface Step {
    title: string;
    message: string;
    icon: React.ReactNode;
    path: string;
    selector: string;
    skipIfMissing?: boolean;
    borderRadius?: string;
}

const STEPS: Step[] = [
    {
        title: "Welcome Guardian",
        message: "I'm Chum! I'll help you turn focus into a flourishing garden. Ready to grow?",
        icon: <Sparkles className="text-amber-400" size={24} />,
        path: "/dashboard",
        selector: "h1"
    },
    {
        title: "Growth Tracking",
        message: "Your growth is tracked through Spirit Essence. Level up to unlock new titles and features.",
        icon: <Zap className="text-teal-400" size={24} />,
        path: "/dashboard",
        selector: "#dashboard-ascension-module"
    },
    {
        title: "Focus Engine",
        message: "The heart of your productivity. Track your Focus Score and initiate intense study flows here.",
        icon: <Zap className="text-amber-500" size={24} />,
        path: "/dashboard",
        selector: "#dashboard-timer-core"
    },
    {
        title: "Neural Reset",
        message: "Neural fog is real. Use the Mindful Reset to recalibrate your brain after long focus sessions.",
        icon: <Brain className="text-cyan-400" size={24} />,
        path: "/dashboard",
        selector: "#dashboard-brain-reset"
    },
    {
        title: "Daily Protocol",
        message: "At dawn, select a productivity framework to calibrate your day. Let's explore the four sacred methods.",
        icon: <SunDim className="text-yellow-400" size={24} />,
        path: "/garden",
        selector: "#morning-protocol-nexus",
        skipIfMissing: true
    },
    {
        title: "Eisenhower Matrix",
        message: "Sort your tasks into four quadrants: Urgent & Important, Not Urgent but Important, Urgent but Not Important, and Just Ignore. Focus on what truly moves the needle.",
        icon: <LayoutGrid className="text-teal-400" size={24} />,
        path: "/garden",
        selector: "#morning-protocol-nexus",
        skipIfMissing: true
    },
    {
        title: "The 1-3-5 Rule",
        message: "Commit to finishing 1 BIG task, 3 MEDIUM tasks, and 5 SMALL tasks. It's the perfect balance for a high-output day without the burnout.",
        icon: <List className="text-amber-400" size={24} />,
        path: "/garden",
        selector: "#morning-protocol-nexus",
        skipIfMissing: true
    },
    {
        title: "Ivy Lee Method",
        message: "Write down your 6 most important tasks. Rank them by priority. NEVER start task #2 until task #1 is fully finished. Discipline of focus.",
        icon: <ListOrdered className="text-indigo-400" size={24} />,
        path: "/garden",
        selector: "#morning-protocol-nexus",
        skipIfMissing: true
    },
    {
        title: "Eat the Frog",
        message: "Identify your one most difficult, most procrastinated, but most important task—the 'Frog'. Click the three dots on any quest and mark it first thing to conquer the day.",
        icon: <Flame className="text-orange-400" size={24} />,
        path: "/dashboard",
        selector: "#task-card-menu-trigger",
        skipIfMissing: true
    },
    {
        title: "Current Focus",
        message: "Manage your active quests here. Use different frameworks to organize your growth potential.",
        icon: <Layout className="text-indigo-400" size={24} />,
        path: "/garden",
        selector: "#garden-active-quests"
    },
    {
        title: "Synthesization",
        message: "Drag completed quests into the Crystal to synthesize Spirit Essence and level up.",
        icon: <Zap className="text-amber-500" size={24} />,
        path: "/garden",
        selector: "#garden-crystal-visual"
    },
    {
        title: "Hall of Mastery",
        message: "Your storage for completed quests and mastered knowledge shards.",
        icon: <Trophy className="text-amber-400" size={24} />,
        path: "/garden",
        selector: "#garden-mastery-col"
    },
    {
        title: "Plant a Quest",
        message: "Plant new goals here. Assign cognitive load and deadlines to structure their growth.",
        icon: <Plus className="text-emerald-400" size={24} />,
        path: "/garden",
        selector: "#garden-add-task-btn"
    },
    {
        title: "Temporal Forecast",
        message: "Switch between Forecast and Month views to see your upcoming path.",
        icon: <Calendar className="text-blue-400" size={24} />,
        path: "/calendar",
        selector: "#calendar-view-toggle"
    },
    {
        title: "Seed Bank",
        message: "Unscheduled quests stay here. Drag seeds from the bank onto the calendar to plant a deadline.",
        icon: <Database className="text-amber-600" size={24} />,
        path: "/calendar",
        selector: "#calendar-seed-bank"
    },
    {
        title: "Temporal Nexus",
        message: "The actual grid of time. Visualize your capacity and focus load across the week.",
        icon: <Calendar className="text-teal-400" size={24} />,
        path: "/calendar",
        selector: "#calendar-temporal-nexus"
    },
    {
        title: "Global Sanctuary",
        message: "The interconnected map. Explore the global grid and find other focusers in the 3D sanctuary.",
        icon: <Globe className="text-cyan-400" size={24} />,
        path: "/lantern",
        selector: "#lantern-map-container",
        borderRadius: "40px"
    },
    {
        title: "Global Leaderboard",
        message: "Compete with the world. Ascension is measured in focus minutes and neural discipline.",
        icon: <Trophy className="text-amber-400" size={24} />,
        path: "/lantern",
        selector: "#lantern-leaderboard"
    },
    {
        title: "Host a Room",
        message: "Create your own private sanctuary for others to join. Host intense study sessions here.",
        icon: <Coffee className="text-amber-600" size={24} />,
        path: "/lantern",
        selector: "#lantern-host-trigger"
    },
    {
        title: "Character Mirror",
        message: "A quick glimpse at your current avatar and equipped artifacts.",
        icon: <ShieldCheck className="text-indigo-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-avatar-preview"
    },
    {
        title: "Personality & Filter",
        message: "Choose your favorite App Theme and Garden Atmosphere filter here.",
        icon: <Palette className="text-cyan-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-themes-tab"
    },
    {
        title: "Crystal Vault",
        message: "Unlock and equip new geode skins as you level up your neural network.",
        icon: <Gem className="text-teal-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-crystals-tab"
    },
    {
        title: "Chum Accessories",
        message: "Outfit your companion with exclusive items found throughout your focus journey.",
        icon: <Shirt className="text-pink-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-accessories-tab"
    },
    {
        title: "Customization Hub",
        message: "Personalize your presence. Switch between App Themes, Crystal Skins, and Accessories.",
        icon: <Palette className="text-pink-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-customization-hub"
    },
    {
        title: "Creative Vortex",
        message: "Freehand drawing and mind-mapping converge here. Build your vision in our custom engine.",
        icon: <Brain className="text-cyan-300" size={24} />,
        path: "/canvas",
        selector: "#canvas-vortex-anchor"
    },
    {
        title: "The Forge",
        message: "Extract raw knowledge from documents to forge Shards for AI training.",
        icon: <Hammer className="text-amber-500" size={24} />,
        path: "/archive",
        selector: "#archive-forge-trigger"
    },
    {
        title: "Shard Vault",
        message: "Stored knowledge fragments. Use them to train with your AI companion.",
        icon: <MessageSquare className="text-teal-400" size={24} />,
        path: "/archive",
        selector: "#archive-shard-vault"
    },
    {
        title: "Identity Vessel",
        message: "Manage your profile, avatars, and premium status here.",
        icon: <User className="text-indigo-300" size={24} />,
        path: "/account",
        selector: "#account-identity-module"
    },
    {
        title: "Neural Protocols",
        message: "Tune your environment settings, performance, and accessibility nodes.",
        icon: <Cpu className="text-amber-300" size={24} />,
        path: "/account",
        selector: "#account-neural-protocols"
    }
];

export default function TutorialIntro() {
    const { hasCompletedTutorial, setCompletedTutorial, triggerChumToast, isInitialized } = useStudyStore();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isCompleting = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, w: 0, h: 0, opacity: 0, radius: '16px' });

    const hasTriggered = useRef(false);
    useEffect(() => {
        if (isInitialized && !hasCompletedTutorial && !hasTriggered.current) {
            hasTriggered.current = true;
            setStep(0);
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else if (hasCompletedTutorial) {
            setIsVisible(false);
        }
    }, [isInitialized, hasCompletedTutorial]);

    useEffect(() => {
        if (!isVisible) return;

        const currentStep = STEPS[step];
        const tPath = currentStep.path.replace(/\/$/, '') || '/dashboard';
        const nPath = (pathname || '/dashboard').replace(/\/$/, '') || '/dashboard';

        if (nPath !== tPath) {
            setIsTransitioning(true);
            router.push(currentStep.path);

            let attempts = 0;
            const poll = setInterval(() => {
                const el = document.querySelector(currentStep.selector);
                const rect = el?.getBoundingClientRect();

                if ((el && rect && rect.width > 2) || attempts > 50) {
                    clearInterval(poll);
                    if (el && rect) {
                        updateSpotlight(el, currentStep.borderRadius);
                    } else if (currentStep.skipIfMissing) {
                        setStep(prev => prev + 1);
                    }
                    setTimeout(() => setIsTransitioning(false), 300);
                }
                attempts++;
            }, 100);

            return () => clearInterval(poll);
        } else {
            const el = document.querySelector(currentStep.selector);
            if (el) {
                updateSpotlight(el, currentStep.borderRadius);
            } else if (currentStep.skipIfMissing) {
                setStep(prev => prev + 1);
            }
            setIsTransitioning(false);
        }
    }, [step, pathname, isVisible]);

    const updateSpotlight = (el: Element, customRadius?: string) => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            setSpotlight({
                x: rect.left,
                y: rect.top,
                w: rect.width,
                h: rect.height,
                opacity: 1,
                radius: customRadius || '16px'
            });
        }, 500);
    };

    const handleNext = () => {
        if (isTransitioning) return;
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        if (isCompleting.current) return;
        isCompleting.current = true;
        try {
            setIsVisible(false);
            await setCompletedTutorial(true);
            setTimeout(() => {
                triggerChumToast("✨ Neural Onboarding Complete! Welcome, Guardian.", "success");
            }, 500);
            router.push("/dashboard");
        } catch (err) {
            console.error("Tutorial sync failed:", err);
            isCompleting.current = false;
        }
    };

    if (!isVisible) return null;

    const currentStep = STEPS[step];
    const isTopHalf = spotlight.opacity > 0 && (spotlight.y + spotlight.h / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 500);
    const isLeftHalf = spotlight.opacity > 0 && (spotlight.x + spotlight.w / 2) < (typeof window !== 'undefined' ? window.innerWidth / 2 : 800);

    return (
        <div className="fixed inset-0 z-[100000] pointer-events-none">
            {/* DARK MASK WITH SMOOTH CLIPPATH */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: 1, clipPath: spotlight.opacity > 0
                        ? `polygon(0% 0%, 0% 100%, ${spotlight.x}px 100%, ${spotlight.x}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px 100%, 100% 100%, 100% 0%)`
                        : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onClick={handleNext}
                className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto cursor-pointer"
            />

            <div className={`absolute inset-0 flex p-6 transition-all duration-700 ${spotlight.opacity === 0 || isTransitioning ? 'items-center justify-center' : isTopHalf ? 'items-end' : 'items-start'
                } ${spotlight.opacity === 0 || isTransitioning ? '' : isLeftHalf ? 'justify-end' : 'justify-start'
                }`}>

                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: isTransitioning ? 0 : 1, scale: isTransitioning ? 0.9 : 1, y: 0 }}
                    className="relative w-full max-w-[320px] bg-(--bg-card) border-2 border-(--border-color) p-6 rounded-[32px] shadow-2xl pointer-events-auto"
                >
                    <div className="absolute -top-12 -left-6 w-24 h-24">
                        <ChumRenderer size="w-20 h-20 scale-[1.5]" />
                    </div>

                    <div className="flex justify-between items-start mb-4 ml-14">
                        <h2 className="text-xl font-black">{currentStep.title}</h2>
                        <button onClick={handleComplete} className="text-(--text-muted) hover:text-red-400 transition-colors"><X size={20} /></button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="flex gap-4">
                            <div className="p-3 rounded-2xl bg-(--bg-dark) border border-(--border-color) shrink-0">{currentStep.icon}</div>
                            <p className="text-sm text-(--text-muted) leading-relaxed font-bold">{currentStep.message}</p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-6">
                        <div className="flex gap-1.5 overflow-hidden max-w-[120px]">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`h-1 shrink-0 rounded-full transition-all duration-300 ${i === step ? 'w-4 bg-(--accent-teal)' : 'w-1 bg-(--border-color)'}`} />
                            ))}
                        </div>
                        <button onClick={handleNext} className="bg-(--accent-teal) text-black rounded-2xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                            {step === STEPS.length - 1 ? "Start Journey" : "Continue"}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* FLOATING BORDER AROUND TARGET */}
            {spotlight.opacity > 0 && !isTransitioning && (
                <motion.div
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute pointer-events-none border-4 border-(--accent-teal) shadow-[0_0_40px_rgba(45,212,191,0.5)]"
                    style={{
                        left: spotlight.x - 8,
                        top: spotlight.y - 8,
                        width: spotlight.w + 16,
                        height: spotlight.h + 16,
                        borderRadius: spotlight.radius
                    }}
                />
            )}
        </div>
    );
}

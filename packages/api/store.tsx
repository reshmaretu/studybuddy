import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './index';
import { playChime, setSoundConfig } from './sound';
import { getGeminiEmbedding, parseDocument } from './ai';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
    Task, TaskLoad, ChumToast, AppNotification,
    PerformanceSettings, AccessibilitySettings,
    ChatMessage, TutorSession, TutorSessionState, Shard, LanternUser, WardrobeAccessory, Invoice,
    SyntheticLog, UserFriendship, Pact, CrystalMastery
} from './types';


const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
};

export const calculateXpRequirement = (level: number) => {
    return Math.floor((100 * Math.pow(level, 1.5)) / 50) * 50;
};

let cloudSyncChannel: RealtimeChannel | null = null;
let cloudSyncUserId: string | null = null;
let notificationsChannel: RealtimeChannel | null = null;
let notificationsUserId: string | null = null;

export const getTitleForLevel = (level: number) => {
    if (level >= 99) return "Guardian of the Garden";
    if (level >= 75) return "Spirit Sage";
    if (level >= 50) return "Master of Flow";
    if (level >= 25) return "Grounded Scholar";
    if (level >= 10) return "Leaf Listener";
    if (level >= 5) return "Seedling";
    return "New Sprout";
};

// WardrobeAccessory moved to types.ts

export interface StudyState {
    activeBaseColor: string;
    setActiveBaseColor: (color: string) => Promise<void>;
    useChumAvatar: boolean;
    setUseChumAvatar: (use: boolean) => Promise<void>;

    userId: string | null;
    displayName: string;
    fullName: string;
    userEmail: string;
    isVerified: boolean;
    avatarUrl: string | null;
    isProfileModalOpen: boolean;
    isBrainResetOpen: boolean;
    isNotificationCenterOpen: boolean;

    setDisplayName: (name: string) => Promise<void>;
    setFullName: (name: string) => Promise<void>;
    setUserEmail: (email: string) => void;
    setIsVerified: (val: boolean) => void;
    setAvatarUrl: (url: string | null) => void;
    setProfileModalOpen: (open: boolean) => void;
    setIsBrainResetOpen: (open: boolean) => void;
    isUnDoneModalOpen: boolean;
    setIsUnDoneModalOpen: (open: boolean) => void;
    setIsNotificationCenterOpen: (open: boolean) => void;
    lastResetHighlightAt: string | null;
    setLastLevelUp: (level: number | null) => void;
    resetBrainResetCycle: () => void;

    // 🌐 CLOUD SYNC STATE
    isInitialized: boolean;
    initializeData: () => Promise<void>;

    isMindDumpOpen: boolean;
    toggleMindDump: () => void;
    mindDumpContent: string;
    setMindDumpContent: (content: string) => void;

    tasks: Task[];
    focusScore: number;
    dailyFocusScores: Record<string, number>;
    flowBreaks: number;
    tabSwitches: number;
    incrementFlowBreak: () => void;
    incrementTabSwitch: () => void;
    resetFlowStats: () => void;
    dailyStreak: number;
    totalSessions: number;
    sessionsSinceLastReset: number;
    totalSecondsTracked: number;
    timeLeft: number;
    isRunning: boolean;
    activeMode: 'none' | 'focusModal' | 'flowState' | 'studyCafe';
    isBreak: boolean;
    focusTaskId: string | null;
    activeTaskId: string | null;
    isFocusModalOpen: boolean;

    pomodoroFocus: number;
    pomodoroShortBreak: number;
    pomodoroLongBreak: number;
    pomodoroCycles: number;

    // 🔔 NOTIFICATIONS
    notifications: AppNotification[];
    notificationsEnabled: boolean;
    addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
    markNotificationRead: (id: string) => void;
    clearNotifications: (category?: 'activity' | 'system') => void;
    requestNotificationPermission: () => Promise<boolean>;
    setNotificationsEnabled: (enabled: boolean) => void;

    // 💎 CRYSTAL GROWTH
    crystalGrowth: number;
    masteredCrystals: CrystalMastery[];
    incrementCrystalGrowth: (amount?: number) => Promise<void>;
    rebirthCrystal: (crystalName: string) => Promise<void>;

    // 🎓 TUTORIAL
    hasCompletedTutorial: boolean;
    setCompletedTutorial: (val: boolean) => void;

    shards: Shard[];
    isTutorModeActive: boolean;
    activeShardId: string | null;

    normalChatHistory: ChatMessage[];
    tutorChatHistory: ChatMessage[];
    pastTutorSessions: TutorSession[];
    tutorSessionState: TutorSessionState;

    aiTier: 'cloud' | 'local' | 'offline';
    aiPrimaryNode: 'openrouter' | 'groq' | 'gemini';
    setAIPrimaryNode: (node: 'openrouter' | 'groq' | 'gemini') => void;
    aiKeys: { groq: string; gemini: string; openrouter: string; llama: string };
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    ollamaUrl: string;

    xp: number;
    level: number;
    lastLevelUp: number | null;
    lastXpGain: number | null;
    sparkBurst: { id: string; name: string } | null;
    setSparkBurst: (burst: { id: string; name: string } | null) => void;
    modifyFocusScore: (amount: number) => Promise<void>;
    gainXp: (amount: number) => Promise<void>;
    completeStudySession: () => Promise<void>;

    activeCrystalTheme: string;
    activeAtmosphereFilter: 'default' | 'dark' | 'refreshing' | 'cool';
    activeAppTheme: string;
    setActiveCrystalTheme: (themeId: string) => void;
    setActiveAtmosphereFilter: (filter: 'default' | 'dark' | 'refreshing' | 'cool') => void;
    setActiveAppTheme: (themeId: string) => Promise<void>;

    activeAccessories: WardrobeAccessory[];
    unlockedThemes: string[];
    toggleAccessory: (acc: WardrobeAccessory) => void;
    setActiveAccessories: (accessories: WardrobeAccessory[]) => Promise<void>;
    syncWardrobe: () => Promise<void>;

    windSpeed: number;
    swayAmount: number;
    setWindSettings: (settings: Partial<{ windSpeed: number; swayAmount: number }>) => void;

    flowerCount: number;
    swayEnabled: boolean;
    setFlowerSettings: (settings: Partial<{ flowerCount: number; swayEnabled: boolean }>) => void;

    // ⚡ ASYNC ACTIONS (Cloud Synced)
    addTask: (task: Omit<Task, 'id' | 'isCompleted'>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    completeTask: (id: string, premiumStats?: { actualPomos?: number; stressLevel?: number }) => Promise<void>;
    forgeShard: (shard: Omit<Shard, "id" | "mastery" | "isMastered" | "createdAt">) => Promise<void>;
    deleteShard: (id: string) => Promise<void>;

    // 🔄 SYNC ACTIONS (Local Only)
    toggleTimer: () => void;
    resetTimer: () => void;
    decrementTimer: () => void;
    incrementSecondsTracked: (amount: number) => void;
    openFocusModal: (taskId?: string) => void;
    closeFocusModal: () => void;
    startMode: (mode: 'flowState' | 'studyCafe', taskId: string | null) => void;
    exitMode: () => void;
    updatePomodoroSettings: (settings: Partial<StudyState>) => void;
    startTutorMode: (shardId: string, type?: StudyState['tutorSessionState']['preferredType']) => void;
    exitTutorMode: () => void;
    completeTutorSession: (masteryGained: number) => Promise<void>;
    updateShardMastery: (id: string, amount: number) => Promise<void>;
    setNormalChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    setTutorChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    updateTutorSessionState: (state: Partial<StudyState['tutorSessionState']>) => void;
    setAITier: (tier: 'cloud' | 'local' | 'offline') => void;
    updateAIKeys: (keys: Partial<StudyState['aiKeys']>) => void;
    setOllamaUrl: (url: string) => void;
    showNodeBadge: boolean;
    setShowNodeBadge: (val: boolean) => void;

    // 💎 PREMIUM STATE
    isPremiumUser: boolean;
    checkPremiumStatus: () => Promise<void>;

    // 🗓️ PLANNING & PRIORITIZATION
    activeFramework: 'eisenhower' | '1-3-5' | 'ivy' | null;
    lastPlannedDate: string | null;
    setActiveFramework: (framework: 'eisenhower' | '1-3-5' | 'ivy' | null) => Promise<void>;
    setLastPlannedDate: (date: string | null) => Promise<void>;

    updateUserTheme: (themeId: string) => Promise<void>;
    isDev: boolean;

    // 🛠️ DEV TOOLS (Global)
    debrisSize: number;
    debrisColor: string;
    debrisCount: number;
    debrisSpread: number;
    setDebris: (settings: Partial<{ size: number, color: string, count: number, spread: number }>) => void;
    enableDevRoomOptions: boolean;
    setEnableDevRoomOptions: (val: boolean) => void;

    reset: () => void;

    // 🎭 MOCK USERS & INVOICES (Dev Only)
    mockUsers: LanternUser[];
    mockInvoices: Invoice[];
    setMockUsers: (val: LanternUser[] | ((prev: LanternUser[]) => LanternUser[])) => void;
    addMockInvoice: (invoice: Invoice) => void;
    setPremiumStatus: (status: boolean) => void;

    // 🔄 OFFLINE SYNC
    offlineQueue: { type: string; payload: any }[];
    addToOfflineQueue: (type: string, payload: any) => void;
    processOfflineQueue: () => Promise<void>;

    chumToasts: ChumToast[];
    triggerChumToast: (message: string | React.ReactNode, type?: 'info' | 'success' | 'warning', action?: () => void) => void;

    // 🏆 PROTOCOL LIMITS
    protocolLimits: { heavy: number; medium: number; light: number };
    updateProtocolLimits: (limits: Partial<{ heavy: number; medium: number; light: number }>) => void;

    // ✏️ EDIT MODAL
    isEditModalOpen: boolean;
    editingTaskId: string | null;
    openEditModal: (taskId: string) => void;
    closeEditModal: () => void;

    // 👁️ VIEW MODAL
    isViewModalOpen: boolean;
    viewingTaskId: string | null;
    openViewModal: (taskId: string) => void;
    closeViewModal: () => void;

    // ☀️ MORNING MODAL
    isMorningModalOpen: boolean;
    setIsMorningModalOpen: (val: boolean) => void;

    // 💎 PREMIUM MODAL
    isPremiumModalOpen: boolean;
    setPremiumModalOpen: (val: boolean) => void;

    // ⚙️ SETTINGS
    doubleClickToComplete: boolean;
    dndEnabled: boolean;
    isSidebarHidden: boolean;
    playTickEnabled: boolean;
    playChimeEnabled: boolean;
    requireCompletionConfirmation: boolean;
    performanceSettings: PerformanceSettings;
    accessibilitySettings: AccessibilitySettings;
    setSettings: (settings: Partial<{ 
        doubleClickToComplete: boolean; 
        dndEnabled: boolean; 
        isSidebarHidden: boolean; 
        playTickEnabled: boolean;
        playChimeEnabled: boolean;
        requireCompletionConfirmation: boolean;
        performanceSettings: Partial<PerformanceSettings>; 
        accessibilitySettings: Partial<AccessibilitySettings> 
    }>) => void;
    useThematicUI: boolean;
    setThematicUI: (val: boolean) => void;
    handleLogout: () => Promise<void>;

    // 🌐 SOCIAL FEATURES
    broadcasts: any[];
    friends: any[];
    friendRequests: any[];
    pacts: any[];
    addBroadcast: (content: string, broadcastType?: string, metadata?: Record<string, any>) => Promise<void>;
    fetchBroadcasts: (limit?: number, offset?: number) => Promise<void>;
    sparkBroadcast: (broadcastId: string) => Promise<void>;
    sendFriendRequest: (targetUserId: string) => Promise<void>;
    fetchFriends: () => Promise<void>;
    fetchFriendRequests: () => Promise<void>;
    acceptFriendRequest: (friendshipId: string) => Promise<void>;
    rejectFriendRequest: (friendshipId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    createPact: (pactName: string, memberIds: string[]) => Promise<void>;
    addPactMembers: (pactId: string, memberIds: string[]) => Promise<void>;
    fetchPacts: () => Promise<void>;
    leavePact: (pactId: string) => Promise<void>;
    deletePact: (pactId: string) => Promise<void>;
    isGhostModeActive: boolean;
    setGhostMode: (val: boolean) => void;
    sendLocalNotification: (title: string, body: string) => void;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set, get) => ({
            activeBaseColor: 'base7', // Default is Aqua Glass!
            setActiveBaseColor: async (activeBaseColor) => {
                set({ activeBaseColor });
                await get().syncWardrobe();
            },
            useChumAvatar: true, // Default: use chum avatar, not custom photo
            setUseChumAvatar: async (useChumAvatar) => {
                set({ useChumAvatar });
                await get().syncWardrobe();
            },

            activeAppTheme: typeof localStorage !== 'undefined' ? localStorage.getItem('appTheme') || 'deep-teal' : 'deep-teal',
            setActiveAppTheme: async (themeId) => {
                set({ activeAppTheme: themeId });
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('appTheme', themeId);
                }
                if (typeof document !== 'undefined') {
                    document.documentElement.setAttribute('data-theme', themeId);
                }
                await get().syncWardrobe();
            },

            isInitialized: false,
            isPremiumUser: false,
            userId: null,
            userEmail: '',
            displayName: 'Guardian',
            fullName: 'New Sprout',
            isVerified: false,
            avatarUrl: null,
            isProfileModalOpen: false,
            isBrainResetOpen: false,
            isMorningModalOpen: false,
            setIsMorningModalOpen: (open) => set({ isMorningModalOpen: open }),
            isUnDoneModalOpen: false,
            isNotificationCenterOpen: false,
            hasCompletedTutorial: false,
            lastResetHighlightAt: null,
            lastLevelUp: null,
            lastXpGain: null,
            mockInvoices: [],

            // 🌐 SOCIAL FEATURES
            broadcasts: [],
            friends: [],
            friendRequests: [],
            pacts: [],
            isGhostModeActive: false,
            setGhostMode: (val) => set({ isGhostModeActive: val }),
            sendLocalNotification: (title, body) => {
                if (typeof window === 'undefined') return;
                
                // 1. Browser Notification API
                if (Notification.permission === 'granted') {
                    // Try SW first for background support
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification(title, {
                                body,
                                icon: '/next.svg',
                                badge: '/next.svg',
                                vibrate: [200, 100, 200]
                            } as any);
                        });
                    } else {
                        new Notification(title, { body, icon: '/next.svg' });
                    }
                }
                
                // 2. Internal App Notification
                get().addNotification({
                    title,
                    message: body,
                    type: 'info',
                    category: 'system'
                });
            },

            setDisplayName: async (name) => {
                set({ displayName: name });
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) await supabase.from('profiles').update({ display_name: name }).eq('id', session.user.id);
            },
            setFullName: async (name) => {
                set({ fullName: name });
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) await supabase.from('profiles').update({ full_name: name }).eq('id', session.user.id);
            },
            setUserEmail: (email) => set({ userEmail: email }),
            setIsVerified: (val) => set({ isVerified: val }),
            setAvatarUrl: (url) => set({ avatarUrl: url }),
            setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
            setIsBrainResetOpen: (open) => set({ isBrainResetOpen: open }),
            setIsUnDoneModalOpen: (open) => set({ isUnDoneModalOpen: open }),
            setIsNotificationCenterOpen: (open) => set({ isNotificationCenterOpen: open }),
            useThematicUI: true,
            setThematicUI: (val) => set({ useThematicUI: val }),
            setLastLevelUp: (val) => set({ lastLevelUp: val }),
            resetBrainResetCycle: () => set({ sessionsSinceLastReset: 0, lastResetHighlightAt: null }),

            addMockInvoice: (invoice) => set((state) => ({
                mockInvoices: [invoice, ...state.mockInvoices]
            })),
            setPremiumStatus: async (status) => {
                set({ isPremiumUser: status });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({ is_premium: status }).eq('id', user.id);
                }
            },
            checkPremiumStatus: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const { data, error } = await supabase
                        .from('profiles')
                        .select('is_premium')
                        .eq('id', session.user.id)
                        .single();

                    if (data && !error) {
                        set({ isPremiumUser: data.is_premium });
                    }
                } catch (error) {
                    console.error("Premium Sync Error:", error);
                }
            },
            isMindDumpOpen: false,
            toggleMindDump: () => set((state) => ({ isMindDumpOpen: !state.isMindDumpOpen })),
            mindDumpContent: '',
            setMindDumpContent: (content) => set({ mindDumpContent: content }),
            tasks: [],
            focusScore: 100,
            dailyFocusScores: {},
            flowBreaks: 0,
            tabSwitches: 0,

            incrementFlowBreak: () => set((state) => ({ flowBreaks: state.flowBreaks + 1 })),
            incrementTabSwitch: () => set((state) => ({ tabSwitches: state.tabSwitches + 1 })),
            resetFlowStats: () => set({ flowBreaks: 0, tabSwitches: 0 }),
            dailyStreak: 3,
            totalSessions: 0,
            sessionsSinceLastReset: 0,
            totalSecondsTracked: 0,
            timeLeft: 1500,
            isRunning: false,
            activeMode: 'none',
            isBreak: false,
            focusTaskId: null,
            activeTaskId: null,
            isFocusModalOpen: false,

            pomodoroFocus: 25,
            pomodoroShortBreak: 5,
            pomodoroLongBreak: 15,
            pomodoroCycles: 4,

            shards: [],
            isTutorModeActive: false,
            activeShardId: null,

            normalChatHistory: [{ role: 'chum', text: "Ready to study." }],
            tutorChatHistory: [],
            pastTutorSessions: [],
            tutorSessionState: {
                questionIndex: 0,
                isSessionComplete: false,
                preferredType: 'mixed',
                totalMasteryGained: 0,
            },

            aiTier: 'cloud',
            aiPrimaryNode: 'openrouter',
            setAIPrimaryNode: (node) => {
                const defaults: Record<string, string> = {
                    openrouter: 'mistralai/mistral-7b-instruct:free',
                    groq: 'llama-3.3-70b-versatile',
                    gemini: 'gemini-1.5-flash'
                };
                set({ aiPrimaryNode: node, selectedModel: defaults[node] });
            },
            aiKeys: { groq: '', gemini: '', openrouter: '', llama: '' },
            selectedModel: 'mistralai/mistral-7b-instruct:free',
            setSelectedModel: (model) => set({ selectedModel: model }),
            ollamaUrl: 'http://localhost:11434',
            showNodeBadge: true,
            setShowNodeBadge: (showNodeBadge) => set({ showNodeBadge }),

            activeFramework: null,
            lastPlannedDate: null,
            isDev: false,
            enableDevRoomOptions: false,
            setEnableDevRoomOptions: (val) => set({ enableDevRoomOptions: val }),
            protocolLimits: { heavy: 1, medium: 3, light: 5 },
            isEditModalOpen: false,
            editingTaskId: null,
            isViewModalOpen: false,
            viewingTaskId: null,

            doubleClickToComplete: true,
            dndEnabled: true,
            isSidebarHidden: false,
            playTickEnabled: true,
            playChimeEnabled: true,
            requireCompletionConfirmation: true,
            performanceSettings: {
                mode: 'auto',
                showParticles: true,
                bloomEnabled: true,
                antialiasing: true
            },
            accessibilitySettings: {
                highContrast: false,
                largeText: false,
                reducedMotion: false
            },
            notifications: [],
            notificationsEnabled: typeof window !== 'undefined'
                && "Notification" in window
                && Notification.permission === "granted",
            addNotification: (notif) => {
                const id = Math.random().toString(36).substring(7);
                const timestamp = new Date().toISOString();

                if (typeof window !== 'undefined'
                    && "Notification" in window
                    && Notification.permission === "granted"
                    && get().notificationsEnabled
                ) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(notif.title, {
                            body: notif.message,
                            icon: '/favicon.ico',
                            tag: id,
                            badge: '/favicon.ico'
                        });
                    });
                }

                set((state) => ({
                    notifications: [{ ...notif, id, timestamp, isRead: false }, ...state.notifications].slice(0, 50)
                }));
            },
            markNotificationRead: (id) => {
                set((state) => ({
                    notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
                }));
                supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
            },
            clearNotifications: (category) => {
                set((state) => ({
                    notifications: category
                        ? state.notifications.filter(n => n.category !== category)
                        : []
                }));
                (async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    const query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
                    if (category) query.eq('category', category);
                    await query;
                })();
            },
            requestNotificationPermission: async () => {
                if (typeof window === 'undefined' || !("Notification" in window)) return false;
                const permission = await Notification.requestPermission();
                const enabled = permission === "granted";
                set({ notificationsEnabled: enabled });
                return enabled;
            },
            setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

            crystalGrowth: 0,
            masteredCrystals: [],

            offlineQueue: [],
            addToOfflineQueue: (type, payload) => set((state) => ({ 
                offlineQueue: [...state.offlineQueue, { type, payload }] 
            })),
            processOfflineQueue: async () => {
                const { offlineQueue } = get();
                if (offlineQueue.length === 0) return;
                
                console.log(`[Sync] Processing ${offlineQueue.length} offline actions...`);
                const remaining = [...offlineQueue];
                
                for (const action of offlineQueue) {
                    try {
                        if (action.type === 'completeTask') {
                            await get().completeTask(action.payload.id, action.payload.metrics);
                        } else if (action.type === 'addBroadcast') {
                            await get().addBroadcast(action.payload.content, action.payload.type, action.payload.metadata);
                        }
                        // Remove successfully processed action
                        remaining.shift();
                    } catch (e) {
                        console.error(`[Sync] Failed to process ${action.type}:`, e);
                        break; // Stop processing if we're still offline or error occurs
                    }
                }
                set({ offlineQueue: remaining });
            },
            incrementCrystalGrowth: async (amount = 1) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                let didHitMastery = false;
                const nextGrowth = Math.min(100, Math.max(0, get().crystalGrowth + amount));
                if (get().crystalGrowth < 100 && nextGrowth >= 100) {
                    didHitMastery = true;
                }
                set({ crystalGrowth: nextGrowth });
                if (didHitMastery) {
                    get().triggerChumToast?.(
                        "Your crystal reached full bloom!",
                        "success"
                    );
                    try {
                        await get().addBroadcast(`Just fully grew their crystal! 💎`, 'milestone');
                    } catch (err) {
                        console.error("Failed to broadcast crystal growth:", err);
                    }
                }
                await supabase.from('crystal_growth').upsert({
                    user_id: user.id,
                    growth: nextGrowth,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            },
            rebirthCrystal: async (crystalName) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const name = crystalName.trim();
                if (!name) return;
                const masteredAt = new Date().toISOString();
                const { data: mastery, error } = await supabase
                    .from('crystal_mastery')
                    .insert([{ user_id: user.id, crystal_name: name, mastered_at: masteredAt, growth_at_mastery: 100 }])
                    .select()
                    .single();
                if (error) throw error;
                set((state) => ({
                    masteredCrystals: [mastery as CrystalMastery, ...state.masteredCrystals],
                    crystalGrowth: 0
                }));
                await supabase.from('crystal_growth').upsert({
                    user_id: user.id,
                    growth: 0,
                    updated_at: masteredAt
                }, { onConflict: 'user_id' });

                // 🌐 Broadcast rebirth to the network
                try {
                    await get().addBroadcast(`Just rebirthed their crystal "${name}"! ✨`, 'milestone');
                } catch (err) {
                    console.error("Failed to broadcast rebirth:", err);
                }
            },
            setCompletedTutorial: async (val) => {
                set({ hasCompletedTutorial: val });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ has_completed_tutorial: val }).eq('id', user.id);
            },
            setSettings: (settings) => {
                if (settings.playTickEnabled !== undefined) {
                    setSoundConfig({ tickEnabled: settings.playTickEnabled });
                }
                if (settings.playChimeEnabled !== undefined) {
                    setSoundConfig({ chimeEnabled: settings.playChimeEnabled });
                }
                
                set((state) => ({
                    ...state,
                    ...settings,
                    performanceSettings: settings.performanceSettings
                        ? { ...state.performanceSettings, ...settings.performanceSettings }
                        : state.performanceSettings,
                    accessibilitySettings: settings.accessibilitySettings
                        ? { ...state.accessibilitySettings, ...settings.accessibilitySettings }
                        : state.accessibilitySettings
                }));
            },
            handleLogout: async () => {
                const { error } = await supabase.auth.signOut();
                if (!error && typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            },

            chumToasts: [],
            triggerChumToast: (message, type = 'info', action) => {
                const id = Math.random().toString(36).substring(7);
                const newToast = { message, type, action, id };
                set((state) => ({ chumToasts: [...state.chumToasts, newToast] }));

                setTimeout(() => {
                    set((state) => ({
                        chumToasts: state.chumToasts.filter((t) => t.id !== id)
                    }));
                }, 8000);
            },

            updateProtocolLimits: (limits) => set((state) => ({ protocolLimits: { ...state.protocolLimits, ...limits } })),
            openEditModal: (taskId) => set({ isEditModalOpen: true, editingTaskId: taskId }),
            closeEditModal: () => set({ isEditModalOpen: false, editingTaskId: null }),
            openViewModal: (taskId) => set({ isViewModalOpen: true, viewingTaskId: taskId }),
            closeViewModal: () => set({ isViewModalOpen: false, viewingTaskId: null }),

            isPremiumModalOpen: false,
            setPremiumModalOpen: (val) => set({ isPremiumModalOpen: val }),

            setActiveFramework: async (framework: 'eisenhower' | '1-3-5' | 'ivy' | null) => {
                set({ activeFramework: framework });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ active_framework: framework }).eq('id', user.id);
            },

            setLastPlannedDate: async (date) => {
                set({ lastPlannedDate: date });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ last_planned_date: date }).eq('id', user.id);
            },

            debrisSize: 0.4,
            debrisColor: "#2dd4bf",
            debrisCount: 3000,
            debrisSpread: 400,
            setDebris: (settings) => set((state) => ({
                debrisSize: settings.size ?? state.debrisSize,
                debrisColor: settings.color ?? state.debrisColor,
                debrisCount: settings.count ?? state.debrisCount,
                debrisSpread: settings.spread ?? state.debrisSpread
            })),



            mockUsers: [],
            setMockUsers: (val) => set((state) => ({
                mockUsers: typeof val === 'function' ? val(state.mockUsers) : val
            })),

            xp: 0,
            level: 1,

            sparkBurst: null,
            setSparkBurst: (burst) => set({ sparkBurst: burst }),

            modifyFocusScore: async (amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => {
                    const newScore = Math.max(0, Math.min(100, state.focusScore + amount));
                    const today = new Date().toISOString().split('T')[0];
                    const updatedDailyScores = { ...state.dailyFocusScores, [today]: newScore };

                    // 🚀 INSTANT backend update (doesn't block frontend)
                    if (user) {
                        supabase.from('user_stats')
                            .update({ focus_score: newScore })
                            .eq('user_id', user.id)
                            .then(({ error }) => {
                                if (error) {
                                    console.error('❌ Focus score update failed:', error);
                                }
                            });
                    }

                    return { focusScore: newScore, dailyFocusScores: updatedDailyScores };
                });
            },

            gainXp: async (amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => {
                    const finalAmount = state.isPremiumUser ? Math.floor(amount * 1.2) : amount;
                    let currentXp = state.xp + finalAmount;
                    let currentLevel = state.level;
                    let xpNeeded = calculateXpRequirement(currentLevel);
                    let didLevelUp = false;

                    while (currentXp >= xpNeeded) {
                        currentXp -= xpNeeded;
                        currentLevel += 1;
                        xpNeeded = calculateXpRequirement(currentLevel);
                        didLevelUp = true;
                    }

                    if (didLevelUp) {
                        set({ lastLevelUp: currentLevel });
                        setTimeout(() => set({ lastLevelUp: null }), 5000);
                        if (state.triggerChumToast) {
                            state.triggerChumToast(
                                <span><strong className="text-yellow-400">🌟 ASCENSION REACHED!</strong><br />Level {currentLevel} achieved. You are now: <span className="text-teal-400">{getTitleForLevel(currentLevel)}</span></span>,
                                'info'
                            );
                        }
                    }

                    if (finalAmount > 0) {
                        set({ lastXpGain: finalAmount });
                        setTimeout(() => set({ lastXpGain: null }), 3000);
                        if (state.triggerChumToast && !didLevelUp) {
                            state.triggerChumToast(
                                <span><strong className="text-teal-400">✨ Essence Absorbed!</strong><br />+{finalAmount} XP added to your neural network.</span>,
                                'success'
                            );
                        }
                    }

                    // 🚀 INSTANT backend update (doesn't block frontend)
                    if (user) {
                        supabase.from('user_stats')
                            .update({ xp: currentXp, level: currentLevel })
                            .eq('user_id', user.id)
                            .then(({ error }) => {
                                if (error) {
                                    console.error('❌ XP/Level update failed:', error);
                                }
                            });
                    }

                    return { xp: currentXp, level: currentLevel };
                });
            },

            completeStudySession: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                get().modifyFocusScore(5);
                get().gainXp(50);
                const newTotal = get().totalSessions + 1;
                const newSinceReset = get().sessionsSinceLastReset + 1;
                set({ totalSessions: newTotal, sessionsSinceLastReset: newSinceReset });

                if (newSinceReset >= 4) {
                    set({ lastResetHighlightAt: new Date().toISOString() });
                    get().triggerChumToast(
                        <span><strong className="text-yellow-400">🧠 Neural Fog Detected!</strong><br />You've completed {newSinceReset} flows without a break. Time for a Brain Reset?</span>,
                        "info",
                        () => get().setIsBrainResetOpen(true)
                    );
                }

                if (user) {
                    supabase.from('user_stats').update({
                        total_sessions: newTotal,
                        total_seconds_tracked: get().totalSecondsTracked
                    }).eq('user_id', user.id).then();
                }
            },

            decrementTimer: () => {
                const { timeLeft, activeMode, isRunning, isBreak, sendLocalNotification, totalSecondsTracked } = get();
                if (!isRunning || timeLeft <= 0) return;
                
                const nextTime = Math.max(0, timeLeft - 1);
                const newTracked = totalSecondsTracked + 1;
                
                set({ 
                    timeLeft: nextTime,
                    totalSecondsTracked: newTracked
                });

                if (nextTime === 0) {
                    if (activeMode === 'studyCafe' || activeMode === 'flowState') {
                        const message = isBreak ? "Break is over! Time to focus." : "Focus session complete! Take a breather.";
                        sendLocalNotification("Timer Finished", message);
                        playChime();
                        if (!isBreak) get().completeStudySession();
                    }
                }

                // ⚡ Sync to DB every 60 seconds of focus
                if (newTracked % 60 === 0) {
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) supabase.from('user_stats').update({ total_seconds_tracked: newTracked }).eq('user_id', user.id).then();
                    });
                }
            },

            incrementSecondsTracked: (amount = 1) => {
                const state = get();
                const newTracked = state.totalSecondsTracked + amount;
                set({ totalSecondsTracked: newTracked });

                // Sync to DB every 60 seconds
                if (newTracked % 60 === 0 || (newTracked % 60 < amount && newTracked > amount)) {
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) supabase.from('user_stats').update({ total_seconds_tracked: newTracked }).eq('user_id', user.id).then();
                    });
                }
            },

            completeTask: async (id, premiumStats) => {
                const { data: { user } } = await supabase.auth.getUser();
                const task = get().tasks.find(t => t.id === id);
                const now = new Date().toISOString();

                // 1. Optimistic & Framework Logic
                set((state) => {
                    let updatedTasks = state.tasks.map((t) => t.id === id ? {
                        ...t,
                        isCompleted: true,
                        completedAt: now,
                        ...premiumStats
                    } : t);

                    if (task?.ivyRank && state.activeFramework === 'ivy') {
                        const completedRank = task.ivyRank;
                        updatedTasks = updatedTasks.map(t => {
                            if (!t.isCompleted && t.ivyRank && t.ivyRank > completedRank) {
                                const newRank = t.ivyRank - 1;
                                if (!t.id.startsWith('temp-')) {
                                    supabase.from('tasks').update({ ivy_rank: newRank }).eq('id', t.id).then();
                                }
                                return { ...t, ivyRank: newRank };
                            }
                            return t;
                        });
                    }
                    return { tasks: updatedTasks };
                });

                // 2. Gameplay Rewards & Neural Fog Logic
                get().modifyFocusScore(5);
                if (task) {
                    const xpReward = task.load === 'heavy' ? 20 : task.load === 'medium' ? 10 : 5;
                    get().gainXp(xpReward);
                    if (!task.isCompleted) get().incrementCrystalGrowth(1);
                }

                const currentMode = get().activeMode;
                const isFocusMode = currentMode === 'flowState' || currentMode === 'studyCafe';
                if (isFocusMode) {
                    const newTotal = get().totalSessions + 1;
                    const newSinceReset = get().sessionsSinceLastReset + 1;
                    set({ totalSessions: newTotal, sessionsSinceLastReset: newSinceReset });

                    if (newSinceReset >= 4) {
                        set({ lastResetHighlightAt: now });
                        get().triggerChumToast(
                            <span><strong className="text-yellow-400">🧠 Neural Fog Detected!</strong><br />You've completed {newSinceReset} flows in the zone. Time for a Brain Reset?</span>,
                            "info",
                            () => get().setIsBrainResetOpen(true)
                        );
                    }
                    if (user) supabase.from('user_stats').update({ total_sessions: newTotal }).eq('user_id', user.id).then();
                }

                // 3. Offline Shield
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    get().addToOfflineQueue('completeTask', { id, metrics: premiumStats });
                    get().triggerChumToast?.('Offline: Task completion queued for sync.', 'info');
                    return;
                }

                // 4. Supabase Sync
                if (!id.startsWith('temp-') && user) {
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            is_completed: true,
                            completed_at: now,
                            actual_pomodoros: premiumStats?.actualPomos,
                            stress_level: premiumStats?.stressLevel
                        })
                        .eq('id', id);

                    if (error) {
                        console.error("Complete task error:", error);
                        get().addToOfflineQueue('completeTask', { id, metrics: premiumStats });
                    }
                }
            },



            activeCrystalTheme: 'quartz',
            activeAtmosphereFilter: 'default',
            unlockedThemes: ['default'],
            activeAccessories: [],
            toggleAccessory: (acc) => set((state) => ({
                activeAccessories: state.activeAccessories.find(a => a.id === acc.id)
                    ? state.activeAccessories.filter(a => a.id !== acc.id)
                    : [...state.activeAccessories, acc]
            })),
            setActiveAccessories: async (accessories) => {
                set({ activeAccessories: accessories });
                await get().syncWardrobe();
            },
            setActiveCrystalTheme: async (themeId) => {
                set({ activeCrystalTheme: themeId });
                await get().syncWardrobe();
            },
            setActiveAtmosphereFilter: async (filter) => {
                set({ activeAtmosphereFilter: filter });
                await get().syncWardrobe();
            },
            syncWardrobe: async () => {
                const userId = get().userId;
                if (!userId) return;
                const state = get();
                const wardrobeData = {
                    active_accessories: state.activeAccessories,
                    active_crystal_theme: state.activeCrystalTheme,
                    active_atmosphere_filter: state.activeAtmosphereFilter,
                    active_chum_base_color: state.activeBaseColor,
                    active_app_theme: state.activeAppTheme
                };
                await supabase.from('chum_wardrobe').upsert({ user_id: userId, ...wardrobeData }, { onConflict: 'user_id' });
            },

            windSpeed: 2.0,
            swayAmount: 0.15,
            setWindSettings: (settings) => set((state) => ({ ...state, ...settings })),
            flowerCount: 2400,
            swayEnabled: true,
            setFlowerSettings: (settings) => set((state) => ({ ...state, ...settings })),

            initializeData: async () => {
                const s = get();
                setSoundConfig({
                    tickEnabled: s.playTickEnabled,
                    chimeEnabled: s.playChimeEnabled
                });
                
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { 
                    set({ isInitialized: true, userId: null }); 
                    return; 
                }

                set({ userId: user.id });

                const mapDbNotification = (row: any): AppNotification | null => {
                    if (!row) return null;
                    const rawType = String(row.type || 'info');
                    const mappedType: AppNotification['type'] =
                        rawType === 'friend_accepted' ? 'success'
                            : rawType === 'friend_request' ? 'info'
                                : rawType === 'pact_invitation' ? 'info'
                                    : (['info', 'success', 'warning', 'error'].includes(rawType)
                                        ? rawType as AppNotification['type']
                                        : 'info');
                    const rawCategory = String(row.category || 'system');
                    const category: AppNotification['category'] =
                        rawCategory === 'activity' || rawCategory === 'system'
                            ? rawCategory
                            : 'system';
                    return {
                        id: String(row.id || Math.random().toString(36).substring(7)),
                        category,
                        type: mappedType,
                        title: row.title || 'Notification',
                        message: row.message || '',
                        timestamp: row.created_at || new Date().toISOString(),
                        isRead: Boolean(row.is_read),
                        link: row.link || undefined
                    };
                };

                const maybeSendWebPush = (notif: AppNotification) => {
                    if (typeof window === 'undefined'
                        || !("Notification" in window)
                        || Notification.permission !== "granted"
                        || !get().notificationsEnabled
                    ) {
                        return;
                    }
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(notif.title, {
                            body: notif.message,
                            icon: '/favicon.ico',
                            tag: notif.id,
                            badge: '/favicon.ico'
                        });
                    });
                };

                try {
                    const fetchSafely = async (query: any) => {
                        try {
                            const res = await query;
                            if (res.error) {
                                console.warn("Fetch error:", res.error);
                                return { data: null, error: res.error };
                            }
                            return res;
                        } catch (e) {
                            console.error("Fetch crash:", e);
                            return { data: null, error: e };
                        }
                    };

                    const [tasksResponse, shardsResponse, profileResponse, statsResponse, wardrobeResponse, sessionsResponse, notificationsResponse, crystalGrowthResponse, crystalMasteryResponse] = await Promise.all([
                        fetchSafely(supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })),
                        fetchSafely(supabase.from('shards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })),
                        fetchSafely(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()),
                        fetchSafely(supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle()),
                        fetchSafely(supabase.from('chum_wardrobe').select('user_id, active_accessories, active_chum_base_color, active_crystal_theme, active_atmosphere_filter, active_app_theme').eq('user_id', user.id).maybeSingle()),
                        fetchSafely(supabase.from('ai_sessions').select('*, shards(title)').eq('user_id', user.id).order('created_at', { ascending: false })),
                        fetchSafely(supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)),
                        fetchSafely(supabase.from('crystal_growth').select('*').eq('user_id', user.id).maybeSingle()),
                        fetchSafely(supabase.from('crystal_mastery').select('*').eq('user_id', user.id).order('mastered_at', { ascending: false }))
                    ]);

                    if (tasksResponse.data) {
                        set({
                            tasks: tasksResponse.data.map((t: any) => ({
                                id: t.id, title: t.title, description: t.description,
                                load: t.load, deadline: t.deadline, isCompleted: t.is_completed, isPinned: t.is_pinned,
                                urgency: t.urgency, importance: t.importance, isFrog: t.is_frog,
                                eisenhowerQuadrant: t.eisenhower_quadrant, ivyRank: t.ivy_rank,
                                completedAt: t.completed_at
                            }))
                        });
                    }

                    if (shardsResponse.data) {
                        set({
                            shards: shardsResponse.data.map((s: any) => ({
                                id: s.id, title: s.title, content: s.content,
                                mastery: s.mastery, isMastered: s.is_mastered, createdAt: s.created_at
                            }))
                        });
                    }

                    if (sessionsResponse.data) {
                        set({
                            pastTutorSessions: sessionsResponse.data.map((s: {
                                id: string;
                                shard_id: string;
                                chat_history: ChatMessage[];
                                mastery_gained: number;
                                created_at: string;
                                shards: { title: string } | null;
                            }): TutorSession => ({
                                id: s.id, shardId: s.shard_id, shardTitle: s.shards?.title || "Unknown Shard",
                                date: s.created_at, history: s.chat_history, masteryGained: s.mastery_gained
                            }))
                        });
                    }

                    if (notificationsResponse.data) {
                        const mapped = (notificationsResponse.data || [])
                            .map(mapDbNotification)
                            .filter((n: any): n is AppNotification => Boolean(n));
                        if (mapped.length > 0) {
                            set({ notifications: mapped });
                        }
                    }

                    if (crystalGrowthResponse.data) {
                        set({ crystalGrowth: crystalGrowthResponse.data.growth || 0 });
                    }

                    if (crystalMasteryResponse.data) {
                        set({ masteredCrystals: crystalMasteryResponse.data as CrystalMastery[] });
                    }

                    // 🛠️ IDENTITY AUTO-HEAL: If profile is missing, create it from metadata
                    const profile = profileResponse.data;
                    const metadata = user.user_metadata;

                    if (!profile) {
                        console.log("Profile missing, auto-creating from metadata...");
                        const newProfile = {
                            id: user.id,
                            display_name: metadata?.display_name || user.email?.split('@')[0] || "Guardian",
                            full_name: metadata?.full_name || metadata?.first_name ? `${metadata.first_name} ${metadata.last_name || ''}` : "Sprout Guardian",
                            is_verified: false,
                            is_premium: false,
                            is_dev: false
                        };
                        // Use upsert with ignoreDuplicates to avoid race condition 409s
                        await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
                        // Refresh cache for this run
                        set({
                            displayName: newProfile.display_name,
                            fullName: newProfile.full_name,
                            isVerified: false,
                            isPremiumUser: false
                        });
                    } else {
                        // 🛠️ LOAD EXISTING PROFILE
                        set({
                            displayName: profile.display_name || "Guardian",
                            fullName: profile.full_name || "Sprout Guardian",
                            isVerified: profile.is_verified || false,
                            isPremiumUser: profile.is_premium || false,
                            isDev: profile.is_dev || false,
                            hasCompletedTutorial: profile.has_completed_tutorial || false,
                            activeFramework: profile.active_framework || null,
                            lastPlannedDate: profile.last_planned_date || null
                        });
                    }

                    // 🛠️ REALTIME SYNC: Listen for changes across the neural network
                    if (cloudSyncChannel) {
                        supabase.removeChannel(cloudSyncChannel);
                        cloudSyncChannel = null;
                        cloudSyncUserId = null;
                    }

                    if (notificationsChannel) {
                        supabase.removeChannel(notificationsChannel);
                        notificationsChannel = null;
                        notificationsUserId = null;
                    }

                    cloudSyncChannel = supabase.channel('cloud-sync');
                    cloudSyncUserId = user.id;

                    notificationsChannel = supabase.channel('notifications');
                    notificationsUserId = user.id;

                    cloudSyncChannel
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
                            if (payload.new) {
                                const updated = payload.new as {
                                    display_name?: string;
                                    full_name?: string;
                                    is_verified?: boolean;
                                    is_premium?: boolean;
                                    is_dev?: boolean;
                                    avatar_url?: string;
                                    active_framework?: string;
                                    last_planned_date?: string;
                                    has_completed_tutorial?: boolean;
                                };
                                set({
                                    displayName: updated.display_name || get().displayName,
                                    fullName: updated.full_name || get().fullName,
                                    isVerified: updated.is_verified ?? get().isVerified,
                                    isPremiumUser: updated.is_premium ?? get().isPremiumUser,
                                    isDev: updated.is_dev ?? get().isDev,
                                    avatarUrl: updated.avatar_url || get().avatarUrl,
                                    activeFramework: (updated.active_framework as any) || get().activeFramework,
                                    lastPlannedDate: updated.last_planned_date || get().lastPlannedDate,
                                    hasCompletedTutorial: updated.has_completed_tutorial ?? get().hasCompletedTutorial
                                });
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats', filter: `user_id=eq.${user.id}` }, (payload) => {
                            if (payload.new) {
                                const stats = payload.new as any;
                                set({
                                    focusScore: stats.focus_score,
                                    xp: stats.xp,
                                    level: stats.level,
                                    totalSessions: stats.total_sessions,
                                    totalSecondsTracked: stats.total_seconds_tracked
                                });
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, (payload) => {
                            // Fetch all tasks again to ensure correct order and state
                            supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
                                if (data) {
                                    set({
                                        tasks: data.map(t => ({
                                            id: t.id, title: t.title, description: t.description,
                                            load: t.load, deadline: t.deadline, isCompleted: t.is_completed, isPinned: t.is_pinned,
                                            urgency: t.urgency, importance: t.importance, isFrog: t.is_frog,
                                            eisenhowerQuadrant: t.eisenhower_quadrant, ivyRank: t.ivy_rank,
                                            completedAt: t.completed_at
                                        }))
                                    });
                                }
                            });
                        })
                        .subscribe();

                    notificationsChannel
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
                            const mapped = mapDbNotification(payload.new);
                            if (!mapped) return;
                            set((state) => {
                                const exists = state.notifications.some(n => n.id === mapped.id);
                                if (exists) return state;
                                return { notifications: [mapped, ...state.notifications].slice(0, 50) };
                            });
                            maybeSendWebPush(mapped);
                        })
                        .subscribe();

                    // 🛠️ STATS AUTO-HEAL
                    if (!statsResponse.data) {
                        await supabase.from('user_stats').insert([{ user_id: user.id, focus_score: 100, level: 1, xp: 0 }]);
                    }

                    // 🛠️ WARDROBE AUTO-HEAL
                    if (!wardrobeResponse.data) {
                        await supabase.from('chum_wardrobe').insert([{ user_id: user.id, active_crystal_theme: 'quartz' }]);
                    }

                    if (!crystalGrowthResponse.data) {
                        await supabase.from('crystal_growth').insert([{ user_id: user.id, growth: 0 }]);
                    }

                    set({
                        userId: user.id,
                        displayName: profile?.display_name || metadata?.display_name || "Guardian",
                        fullName: profile?.full_name || metadata?.full_name || "New Sprout",
                        isVerified: profile?.is_verified || false,
                        userEmail: user.email || "",
                        focusScore: statsResponse.data?.focus_score ?? 100,
                        totalSessions: statsResponse.data?.total_sessions ?? 0,
                        totalSecondsTracked: statsResponse.data?.total_seconds_tracked ?? 0,
                        xp: statsResponse.data?.xp ?? 0,
                        level: statsResponse.data?.level ?? 1,
                        avatarUrl: profile?.avatar_url || null,
                        isPremiumUser: profile?.is_premium || false,
                        isDev: profile?.is_dev || false,
                        activeFramework: profile?.active_framework || null,
                        lastPlannedDate: profile?.last_planned_date || null,
                        aiKeys: {
                            openrouter: profile?.openrouter_key || "",
                            gemini: profile?.gemini_key || "",
                            groq: profile?.groq_key || "",
                            llama: profile?.llama_key || ""
                        },
                        hasCompletedTutorial: profile?.has_completed_tutorial || false,
                    });

                    const wardrobe = wardrobeResponse.data;
                    if (wardrobe) {
                        const appTheme = wardrobe.active_app_theme || 'deep-teal';
                        
                        // Robustly handle accessories (ensure it's always an array)
                        let rawAccessories = wardrobe.active_accessories;
                        if (typeof rawAccessories === 'string') {
                            try {
                                rawAccessories = JSON.parse(rawAccessories);
                            } catch (e) {
                                rawAccessories = [];
                            }
                        }
                        const finalAccessories = Array.isArray(rawAccessories) ? rawAccessories : [];

                        set({
                            activeAccessories: finalAccessories,
                            activeCrystalTheme: wardrobe.active_crystal_theme || 'quartz',
                            activeAtmosphereFilter: wardrobe.active_atmosphere_filter || 'default',
                            activeBaseColor: wardrobe.active_chum_base_color || 'base7',
                            activeAppTheme: appTheme,
                        });

                        if (typeof document !== 'undefined') document.documentElement.setAttribute("data-theme", appTheme);
                        if (typeof localStorage !== 'undefined') localStorage.setItem("appTheme", appTheme);

                        // 🔊 SYNC SOUND CONFIG ON LOAD
                        const state = get();
                        setSoundConfig({
                            tickEnabled: state.playTickEnabled,
                            chimeEnabled: state.playChimeEnabled
                        });
                    } else {
                        // Default values if no wardrobe found
                        const defaultTheme = 'deep-teal';
                        set({ activeAppTheme: defaultTheme });
                        if (typeof document !== 'undefined') document.documentElement.setAttribute("data-theme", defaultTheme);
                    }

                    if (tasksResponse.data?.length === 0 && shardsResponse.data?.length === 0) {
                        await get().addTask({
                            title: "Tend your first bloom",
                            description: "Welcome to StudyBuddy. Complete this task by dragging it to the completion zone.",
                            load: "light",
                            deadline: new Date(Date.now() + 86400000).toISOString(),
                            estimatedPomos: 1
                        });
                        await get().forgeShard({
                            title: "The Garden Philosophy",
                            content: "In this digital sanctuary, your focus is the rain that feeds the garden.",
                            files: []
                        });
                        get().addNotification({
                            category: "system", type: "info", title: "Welcome, Guardian",
                            message: "The garden is now linked to your neural network."
                        });
                    }
                } catch (error) {
                    console.error("Initialization failed:", error);
                } finally {
                    set({ isInitialized: true });
                    // ⚡ Auto-sync on rehydration
                    if (get().offlineQueue.length > 0 && navigator.onLine) {
                        get().processOfflineQueue();
                    }
                }
            },

            addTask: async (task) => {
                const userId = get().userId;
                if (!userId) return;
                const tempId = `temp-${Date.now()}`;
                set((state) => ({ tasks: [{ ...task, id: tempId, isCompleted: false }, ...state.tasks] }));
                const { data } = await supabase.from('tasks').insert([{
                    user_id: userId, title: task.title, description: task.description,
                    load: task.load, deadline: task.deadline, estimated_pomodoros: task.estimatedPomos
                }]).select().single();
                if (data) set((state) => ({ tasks: state.tasks.map(t => t.id === tempId ? { ...t, id: data.id } : t) }));
            },

            deleteTask: async (id) => {
                const userId = get().userId;
                if (!userId) return;
                set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
                await supabase.from('tasks').delete().eq('id', id);
            },

            updateTask: async (id, updates) => {
                const userId = get().userId;
                if (!userId) return;
                set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }));

                const dbUpdates: any = { ...updates };
                if (updates.isCompleted !== undefined) { dbUpdates.is_completed = updates.isCompleted; delete dbUpdates.isCompleted; }
                if (updates.isPinned !== undefined) { dbUpdates.is_pinned = updates.isPinned; delete dbUpdates.isPinned; }
                if (updates.isFrog !== undefined) { dbUpdates.is_frog = updates.isFrog; delete dbUpdates.isFrog; }
                if (updates.eisenhowerQuadrant !== undefined) { dbUpdates.eisenhower_quadrant = updates.eisenhowerQuadrant; delete dbUpdates.eisenhowerQuadrant; }
                if (updates.ivyRank !== undefined) { dbUpdates.ivy_rank = updates.ivyRank; delete dbUpdates.ivyRank; }
                await supabase.from('tasks').update(dbUpdates).eq('id', id);
            },

            forgeShard: async (shard) => {
                const userId = get().userId;
                if (!userId) return;
                const tempId = `temp-shard-${Date.now()}`;
                set((state) => ({ shards: [{ ...shard, id: tempId, mastery: 0, isMastered: false, createdAt: new Date().toISOString() }, ...state.shards] }));

                try {
                    const geminiKey = get().aiKeys.gemini;
                    const llamaKey = get().aiKeys.llama || process.env.NEXT_PUBLIC_LLAMA_CLOUD_API_KEY;

                    if (!geminiKey) throw new Error("Gemini API Key missing.");

                    let finalContent = shard.content || "";
                    let finalTitle = shard.title || "Untitled Shard";

                    // 1. LlamaParse
                    if (shard.files && shard.files.length > 0) {
                        if (!llamaKey) throw new Error("LlamaKey missing for file processing.");
                        const parsed = await parseDocument(shard.files[0], llamaKey);
                        finalContent = (finalContent ? finalContent + "\n\n" : "") + parsed;
                        if (!shard.title) finalTitle = shard.files[0].name;
                    }

                    // 2. Embeddings
                    const embedding = await getGeminiEmbedding(finalContent, geminiKey);

                    // 3. Supabase Save
                    const { data: newShard, error: shardError } = await supabase
                        .from('shards')
                        .insert([{ user_id: userId, title: finalTitle, content: finalContent }])
                        .select().single();

                    if (shardError) throw shardError;

                    await supabase.from('shard_embeddings').insert([{ shard_id: newShard.id, embedding }]);

                    set((state) => ({
                        shards: state.shards.map(s => s.id === tempId ? {
                            id: newShard.id, title: newShard.title, content: newShard.content,
                            mastery: 0, isMastered: false, createdAt: newShard.created_at
                        } : s)
                    }));
                } catch (error: any) {
                    alert(`Failed to forge shard: ${error.message}`);
                    set((state) => ({ shards: state.shards.filter(s => s.id !== tempId) }));
                }
            },

            deleteShard: async (id) => {
                set((state) => ({
                    shards: state.shards.filter(s => s.id !== id),
                    isTutorModeActive: state.activeShardId === id ? false : state.isTutorModeActive,
                    activeShardId: state.activeShardId === id ? null : state.activeShardId
                }));
                await supabase.from('shards').delete().eq('id', id);
            },

            toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),
            resetTimer: () => set((state) => ({ timeLeft: state.pomodoroFocus * 60, isRunning: false })),
            openFocusModal: (taskId) => set({ isFocusModalOpen: true, focusTaskId: taskId || null }),
            closeFocusModal: () => set({ isFocusModalOpen: false, focusTaskId: null }),
            startMode: (mode, taskId) => set((state) => ({
                activeMode: mode, activeTaskId: taskId, isFocusModalOpen: false,
                timeLeft: state.pomodoroFocus * 60, isRunning: true
            })),
            exitMode: () => {
                const { totalSecondsTracked, userId } = get();
                set({ activeMode: 'none', activeTaskId: null, isRunning: false });
                if (userId) supabase.from('user_stats').update({ total_seconds_tracked: totalSecondsTracked }).eq('user_id', userId).then();
            },

            updatePomodoroSettings: (settings) => set((state) => ({ ...state, ...settings })),
            startTutorMode: (shardId, type) => set((state) => ({
                isTutorModeActive: true, activeShardId: shardId, tutorChatHistory: [],
                tutorSessionState: {
                    questionIndex: 0, isSessionComplete: false,
                    preferredType: type || state.tutorSessionState.preferredType || 'mixed',
                    totalMasteryGained: 0
                }
            })),
            exitTutorMode: () => set({ isTutorModeActive: false, activeShardId: null, tutorChatHistory: [] }),
            completeTutorSession: async (masteryGained) => {
                const userId = get().userId;
                if (!userId) return;
                const activeShard = get().shards.find(s => s.id === get().activeShardId);
                if (!activeShard) return;
                const newSession: TutorSession = {
                    id: Date.now().toString(), shardId: activeShard.id, shardTitle: activeShard.title,
                    date: new Date().toISOString(), history: get().tutorChatHistory, masteryGained
                };
                set((state) => ({
                    pastTutorSessions: [newSession, ...state.pastTutorSessions],
                    tutorSessionState: { ...state.tutorSessionState, isSessionComplete: true, totalMasteryGained: 0 }
                }));
                await supabase.from('ai_sessions').insert([{
                    user_id: userId, shard_id: activeShard.id,
                    chat_history: get().tutorChatHistory, mastery_gained: masteryGained
                }]);
            },

            updateShardMastery: async (id, amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                let masteredShardRef: Shard | null = null;
                let updatedShardRef: Shard | null = null;
                set((state) => {
                    const newShards = state.shards.map(shard => {
                        if (shard.id !== id) return shard;
                        const newMastery = Math.min(100, shard.mastery + amount);
                        const isNowMastered = newMastery >= 100;
                        const updatedShard = { ...shard, mastery: newMastery, isMastered: isNowMastered };
                        updatedShardRef = updatedShard;
                        if (isNowMastered && !shard.isMastered) masteredShardRef = updatedShard;
                        return updatedShard;
                    });
                    return { shards: newShards };
                });
                if (updatedShardRef) {
                    await supabase.from('shards').update({
                        mastery: (updatedShardRef as Shard).mastery,
                        is_mastered: (updatedShardRef as Shard).isMastered,
                        last_mastered_date: new Date().toISOString()
                    }).eq('id', id);
                }
                if (masteredShardRef) {
                    get().gainXp(250); get().modifyFocusScore(15);
                    playChime();
                    get().triggerChumToast?.(`Spirit Connection Blooms! +250 XP for ${(masteredShardRef as Shard).title}!`);
                    await supabase.from('tasks').insert([{
                        user_id: user.id, title: `Mastered: ${(masteredShardRef as Shard).title}`,
                        load: 'heavy', is_completed: true, is_pinned: true
                    }]);
                }
            },

            setNormalChatHistory: (history) => set((state) => ({ normalChatHistory: typeof history === 'function' ? history(state.normalChatHistory) : history })),
            setTutorChatHistory: (history) => set((state) => ({ tutorChatHistory: typeof history === 'function' ? history(state.tutorChatHistory) : history })),
            updateTutorSessionState: (update) => set((state) => ({ tutorSessionState: { ...state.tutorSessionState, ...update } })),
            setAITier: (tier) => set({ aiTier: tier }),
            updateAIKeys: async (keys) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => ({ aiKeys: { ...state.aiKeys, ...keys } }));
                if (user) {
                    const dbUpdates: any = {};
                    if (keys.openrouter !== undefined) dbUpdates.openrouter_key = keys.openrouter;
                    if (keys.gemini !== undefined) dbUpdates.gemini_key = keys.gemini;
                    if (keys.groq !== undefined) dbUpdates.groq_key = keys.groq;
                    if (keys.llama !== undefined) dbUpdates.llama_key = keys.llama;
                    await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
                }
            },
            setOllamaUrl: (url) => set({ ollamaUrl: url }),
            updateUserTheme: async (themeId: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                if (["sakura", "academia", "lofi", "nordic", "e-ink"].includes(themeId) && !get().isPremiumUser) return;
                await supabase.from('chum_wardrobe').update({ active_app_theme: themeId }).eq('user_id', user.id);
                if (typeof document !== 'undefined') document.documentElement.setAttribute("data-theme", themeId);
                if (typeof localStorage !== 'undefined') localStorage.setItem("appTheme", themeId);
            },

            // 🌐 SOCIAL FEATURE METHODS (CLIENT-DIRECT)
            addBroadcast: async (content, broadcastType = 'custom-status', metadata = {}) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    get().addToOfflineQueue('addBroadcast', { content, type: broadcastType, metadata });
                    get().triggerChumToast?.('Offline: Broadcast queued for sync.', 'info');
                    return;
                }

                const { data, error } = await supabase
                    .from('synthetic_logs')
                    .insert([{ 
                        user_id: user.id, 
                        content, 
                        broadcast_type: broadcastType,
                        metadata 
                    }])
                    .select('*, profiles(display_name, avatar_url)')
                    .single();

                if (error) {
                    console.error("Add broadcast error:", error);
                    get().addToOfflineQueue('addBroadcast', { content, type: broadcastType, metadata });
                    return;
                }
                set((state) => ({ broadcasts: [data, ...state.broadcasts] }));
                get().triggerChumToast?.('Your message has been shared with the network!', 'success');
            },

            fetchBroadcasts: async (limit = 50, offset = 0) => {
                const { data, error } = await supabase
                    .from('synthetic_logs')
                    .select('*, profiles(display_name, avatar_url)')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) {
                    console.error("Fetch broadcasts error:", error);
                    return;
                }
                set((state) => ({ broadcasts: offset === 0 ? data : [...state.broadcasts, ...data] }));
            },

            sparkBroadcast: async (broadcastId: string) => {
                // Optimistic update
                set((state) => ({
                    broadcasts: state.broadcasts.map((b) =>
                        b.id === broadcastId ? { ...b, reactions_count: (b.reactions_count || 0) + 1 } : b
                    )
                }));

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // We use an RPC call for atomic increment to avoid race conditions
                const { error } = await supabase.rpc('increment_broadcast_reaction', { broadcast_id: broadcastId });
                if (error) console.error("Spark error:", error);
            },

            sendFriendRequest: async (targetUserId) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const user_id_1 = user.id < targetUserId ? user.id : targetUserId;
                const user_id_2 = user.id < targetUserId ? targetUserId : user.id;

                const { data, error } = await supabase
                    .from('user_friendships')
                    .insert([{ user_id_1, user_id_2, status: 'pending' }])
                    .select();

                if (error) {
                    if (error.code === '23505') {
                        get().triggerChumToast?.('Friend request already sent.', 'warning');
                    } else {
                        throw error;
                    }
                } else {
                    get().triggerChumToast?.('Friend request sent!', 'success');
                }
                await get().fetchFriendRequests();
            },

            fetchFriends: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('user_friendships')
                    .select(`
                        id,
                        user_id_1,
                        user_id_2,
                        status,
                        profiles_1:user_id_1(id, display_name, avatar_url),
                        profiles_2:user_id_2(id, display_name, avatar_url)
                    `)
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
                    .eq('status', 'accepted');

                if (error) throw error;
                
                const formatted = data.map(f => {
                    const otherProfile = f.user_id_1 === user.id ? f.profiles_2 : f.profiles_1;
                    return { ...f, friend_profile: otherProfile };
                });

                set({ friends: formatted });
            },

            fetchFriendRequests: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('user_friendships')
                    .select(`
                        id,
                        user_id_1,
                        user_id_2,
                        status,
                        profiles_1:user_id_1(id, display_name, avatar_url),
                        profiles_2:user_id_2(id, display_name, avatar_url)
                    `)
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
                    .eq('status', 'pending');

                if (error) throw error;
                set({ friendRequests: data });
            },

            acceptFriendRequest: async (friendshipId) => {
                const { error } = await supabase
                    .from('user_friendships')
                    .update({ status: 'accepted' })
                    .eq('id', friendshipId);

                if (error) throw error;
                get().triggerChumToast?.('Friend request accepted!', 'success');
                await Promise.all([get().fetchFriends(), get().fetchFriendRequests()]);
            },

            rejectFriendRequest: async (friendshipId) => {
                const { error } = await supabase
                    .from('user_friendships')
                    .delete()
                    .eq('id', friendshipId);

                if (error) throw error;
                await get().fetchFriendRequests();
            },

            removeFriend: async (friendshipId) => {
                const { error } = await supabase
                    .from('user_friendships')
                    .delete()
                    .eq('id', friendshipId);

                if (error) throw error;
                await get().fetchFriends();
            },

            createPact: async (pactName, memberIds) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: pact, error: pactError } = await supabase
                    .from('pacts')
                    .insert([{ pact_name: pactName, created_by: user.id }])
                    .select()
                    .single();

                if (pactError) throw pactError;

                const members = [user.id, ...memberIds].map(uid => ({
                    pact_id: pact.id,
                    user_id: uid
                }));

                const { error: memberError } = await supabase
                    .from('pact_members')
                    .insert(members);

                if (memberError) throw memberError;

                await get().fetchPacts();
                get().triggerChumToast?.(`Pact "${pactName}" created! Your lanterns are now connected.`, 'success');
            },

            addPactMembers: async (pactId: string, memberIds: string[]) => {
                const members = memberIds.map(uid => ({
                    pact_id: pactId,
                    user_id: uid
                }));

                const { error } = await supabase
                    .from('pact_members')
                    .insert(members);

                if (error) throw error;
                await get().fetchPacts();
                get().triggerChumToast?.('Pact members added.', 'success');
            },

            fetchPacts: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('pacts')
                    .select(`
                        *,
                        pact_members (
                            user_id,
                            profiles (id, display_name, avatar_url)
                        )
                    `)
                    .in('id', (
                        await supabase
                            .from('pact_members')
                            .select('pact_id')
                            .eq('user_id', user.id)
                    ).data?.map(pm => pm.pact_id) || []);

                if (error) throw error;
                set({ pacts: data });
            },

            leavePact: async (pactId: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { error } = await supabase
                    .from('pact_members')
                    .delete()
                    .eq('pact_id', pactId)
                    .eq('user_id', user.id);

                if (error) throw error;
                await get().fetchPacts();
                get().triggerChumToast?.('You have left the pact.', 'info');
            },

            deletePact: async (pactId: string) => {
                const { error } = await supabase
                    .from('pacts')
                    .delete()
                    .eq('id', pactId);

                if (error) throw error;
                await get().fetchPacts();
                get().triggerChumToast?.('Pact deleted.', 'info');
            },

            reset: () => set({
                isInitialized: false, tasks: [], shards: [], focusScore: 100, totalSessions: 0, totalSecondsTracked: 0,
                activeMode: 'none', activeTaskId: null, focusTaskId: null, isPremiumUser: false,
                normalChatHistory: [{ role: 'chum', text: "Ready to study." }],
                tutorChatHistory: [], pastTutorSessions: [], sessionsSinceLastReset: 0, lastResetHighlightAt: null,
                broadcasts: [], friends: [], friendRequests: [], pacts: [],
                crystalGrowth: 0, masteredCrystals: []
            }),
        }),
        {
            name: 'studybuddy-storage',
            partialize: (state) => ({
                aiKeys: state.aiKeys, aiTier: state.aiTier, aiPrimaryNode: state.aiPrimaryNode,
                selectedModel: state.selectedModel, ollamaUrl: state.ollamaUrl,
                pomodoroFocus: state.pomodoroFocus, pomodoroShortBreak: state.pomodoroShortBreak,
                pomodoroLongBreak: state.pomodoroLongBreak, pomodoroCycles: state.pomodoroCycles,
                activeCrystalTheme: state.activeCrystalTheme,
                activeAccessories: state.activeAccessories || [], windSpeed: state.windSpeed,
                swayAmount: state.swayAmount, flowerCount: state.flowerCount, swayEnabled: state.swayEnabled,
                dailyFocusScores: state.dailyFocusScores, flowBreaks: state.flowBreaks,
                tabSwitches: state.tabSwitches, sessionsSinceLastReset: state.sessionsSinceLastReset,
                lastResetHighlightAt: state.lastResetHighlightAt, notifications: state.notifications,
                notificationsEnabled: state.notificationsEnabled,
                crystalGrowth: state.crystalGrowth,
                masteredCrystals: state.masteredCrystals,
                hasCompletedTutorial: state.hasCompletedTutorial, enableDevRoomOptions: state.enableDevRoomOptions,
                useThematicUI: state.useThematicUI,
                activeBaseColor: state.activeBaseColor,
                playTickEnabled: state.playTickEnabled,
                playChimeEnabled: state.playChimeEnabled,
                doubleClickToComplete: state.doubleClickToComplete,
                requireCompletionConfirmation: state.requireCompletionConfirmation,
                performanceSettings: state.performanceSettings,
                accessibilitySettings: state.accessibilitySettings,
                // 📦 OFFLINE ESSENTIALS
                tasks: state.tasks,
                shards: state.shards,
                totalSecondsTracked: state.totalSecondsTracked,
                displayName: state.displayName,
                fullName: state.fullName,
                avatarUrl: state.avatarUrl,
                focusScore: state.focusScore,
                totalSessions: state.totalSessions,
                dailyStreak: state.dailyStreak,
                activeAppTheme: state.activeAppTheme,
                mindDumpContent: state.mindDumpContent,
                offlineQueue: state.offlineQueue,
                broadcasts: state.broadcasts,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    setSoundConfig({ 
                        tickEnabled: state.playTickEnabled,
                        chimeEnabled: state.playChimeEnabled
                    });
                }
            }
        }
    )
);

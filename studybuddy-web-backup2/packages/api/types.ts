import React from 'react';

export type TaskLoad = 'light' | 'medium' | 'heavy';

export interface WardrobeAccessory {
    id: string;
    fileName: string;
    zIndex: number;
    name?: string;
}

export interface ChumToast {
    id: string; // Add ID for tracking
    message: string | React.ReactNode;
    type?: 'info' | 'success' | 'warning' | 'error';
    action?: () => void;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    load: TaskLoad;
    deadline?: string;
    isCompleted: boolean;
    isPinned?: boolean;
    urgency?: boolean;
    importance?: boolean;
    isFrog?: boolean;
    eisenhowerQuadrant?: number;
    ivyRank?: number;
    completedAt?: string;
    estimatedPomos?: number;
    actualPomos?: number;
    stressLevel?: number;
}

export interface AppNotification {
    id: string;
    category: 'activity' | 'system';
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    link?: string;
}

export type PerformanceMode = 'auto' | 'high' | 'balanced' | 'low';

export interface AccessibilitySettings {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
}

export interface PerformanceSettings {
    mode: PerformanceMode;
    showParticles: boolean;
    bloomEnabled: boolean;
    antialiasing: boolean;
}

export interface ChatMessage {
    role: 'user' | 'chum';
    text: string;
    node?: string;
}

export interface TutorSession {
    id: string;
    shardId: string;
    shardTitle: string;
    date: string;
    history: ChatMessage[];
    masteryGained: number;
}

export interface TutorSessionState {
    questionIndex: number;
    isSessionComplete: boolean;
    preferredType: "mixed" | "multiple choice" | "identification" | "true or false";
    totalMasteryGained: number;
}

export interface Shard {
    id: string;
    title: string;
    content: string;
    files?: { name: string; type: string; content?: string }[];
    mastery: number;
    isMastered: boolean;
    createdAt: string;
}

export interface LanternUser {
    id: string;
    name: string;
    chumLabel: string;
    focusScore: number;
    status: 'offline' | 'idle' | 'drafting' | 'hosting' | 'joined' | 'flowState' | 'cafe' | 'mastering';
    hours: number;
    roomCode?: string;
    roomTitle?: string;
    roomDescription?: string;
    roomMode?: string;
    isPremium: boolean;
    isHosting: boolean;
    gridX: number;
    gridY: number;
    gridZ: number;
    jitterX: number;
    jitterY: number;
    jitterZ: number;
    avatarUrl?: string;
    activeBaseColor?: string;
    activeAccessories?: WardrobeAccessory[];
    useChumAvatar?: boolean;
    isVerified?: boolean;
}

export interface Invoice {
    id: string;
    date: string;
    amount: string;
    method: string;
}

// 🌐 SOCIAL FEATURES

export interface SyntheticLog {
    id: string;
    user_id: string;
    content: string;
    broadcast_type: 'custom-status' | 'milestone' | 'quest-progress' | 'feedback' | 'study-room' | 'canvas-room';
    created_at: string;
    reactions_count: number;
    metadata?: {
        room_code?: string;
        room_title?: string;
        room_description?: string;
        room_mode?: string;
        [key: string]: any;
    };
    profiles?: {
        display_name: string;
        full_name?: string | null;
        avatar_url: string | null;
        status: string;
        chum_wardrobe?: Array<{
            active_accessories: WardrobeAccessory[];
            active_chum_base_color: string | null;
        }>;
    };
}


export interface UserFriendship {
    id: string;
    user_id_1: string;
    user_id_2: string;
    requester_id?: string | null;
    status: 'pending' | 'accepted';
    created_at: string;
    profiles_1?: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        status: string;
    };
    profiles_2?: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        status: string;
    };
}

export interface Pact {
    id: string;
    pact_name: string;
    created_by: string;
    constellation_color: string;
    created_at: string;
    members?: Array<{
        id: string;
        display_name?: string | null;
        avatar_url?: string | null;
        status?: string | null;
    }>;
}

export interface PactMember {
    pact_id: string;
    user_id: string;
    joined_at: string;
    profiles?: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        status: string;
    };
}

export interface CrystalMastery {
    id: string;
    user_id: string;
    crystal_name: string;
    mastered_at: string;
    growth_at_mastery: number;
}

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Trophy, Radio, Plus, X, Crosshair, ShieldAlert, Users, Sparkles } from "lucide-react";
import ThreeLanternNet, { LanternNetHandle } from "@/components/LanternNetwork";
import ChumRenderer from "@/components/ChumRenderer";
import { FriendRequestModal, AddFriendModal, FormPactModal, SquishyButton } from "@studybuddy/ui";
import { useStudyStore, WardrobeAccessory, LanternUser, Pact } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useTerms } from "@/hooks/useTerms";

// LanternUser moved to global types.ts

const getStableRandom = (id: string, seed: string) => {
    let hash = 0;
    const str = id + seed;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
};

// 🏛️ ARCHITECT'S POSITION RESOLVER
// Decouples coordinates from hours and ensures no collisions
const getUniqueCoordinates = (pId: string, isMe: boolean) => {
    if (isMe) return { x: 6, y: 6, z: 6 };
    const hash = (id: string) => {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i);
        return Math.abs(h);
    };
    const h = hash(pId);
    // Larger virtual grid volume for better spread
    const spread = 15;
    return {
        x: (h % spread) - 2,
        y: (Math.floor(h / spread) % spread) - 2,
        z: (Math.floor(h / (spread * spread)) % spread) - 2
    };
};

interface RawProfile {
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    status?: string | null;
    is_in_flowstate?: boolean;
    active_session_type?: string | null;
    is_premium?: boolean;
    avatar_url?: string | null;
    is_verified?: boolean;
    joined_room_code?: string | null;
    user_stats?: { total_seconds_tracked?: number; focus_score?: number } | null;
    chum_wardrobe?: { active_accessories?: WardrobeAccessory[]; active_chum_base_color?: string | null } | null;
}

interface RawRoom {
    room_code: string;
    host_id: string;
    name: string;
    description?: string | null;
    status: string;
    mode: string;
}

const formatUser = (p: RawProfile, rooms: RawRoom[], currentUserId: string | null, index: number): LanternUser => {
    const hostedRoom = rooms.find(r => r.host_id === p.id);
    const joinedRoom = p.joined_room_code ? rooms.find(r => r.room_code === p.joined_room_code) : null;
    const isMe = p.id === currentUserId;

    let currentStatus: LanternUser['status'] = 'idle';

    if (p.active_session_type === 'AI_TUTOR') {
        currentStatus = 'mastering';
    } else if (hostedRoom) {
        currentStatus = hostedRoom.status === 'DRAFT' ? 'drafting' :
            (hostedRoom.mode === 'cafe' ? 'cafe' : 'hosting');
    } else if (p.status === 'joined') {
        currentStatus = 'joined';
    } else if (p.is_in_flowstate) {
        currentStatus = 'flowState';
    } else {
        currentStatus = (p.status as LanternUser['status']) || 'offline';
    }

    const stats = Array.isArray(p.user_stats) ? p.user_stats[0] : p.user_stats;
    const wardrobe = Array.isArray(p.chum_wardrobe) ? p.chum_wardrobe[0] : p.chum_wardrobe;

    // Unique Grid logic (Randomized XYZ, no collisions)
    const coords = getUniqueCoordinates(p.id, isMe);
    const gridX = coords.x;
    const gridY = coords.y;
    const gridZ = coords.z;

    const relevantRoom = hostedRoom || joinedRoom;

    // Robustly handle accessories (ensure it's always an array)
    let rawAccessories = wardrobe?.active_accessories;
    if (typeof rawAccessories === 'string') {
        try {
            rawAccessories = JSON.parse(rawAccessories);
        } catch (e) {
            rawAccessories = [];
        }
    }
    const finalAccessories = Array.isArray(rawAccessories) ? rawAccessories : [];

    return {
        id: isMe ? 'me' : p.id,
        name: (p.display_name && p.display_name.trim() !== "") ? p.display_name : (p.full_name && p.full_name.trim() !== "") ? p.full_name : "Anonymous",
        status: currentStatus,
        hours: stats ? Number(((stats.total_seconds_tracked || 0) / 3600).toFixed(1)) : 0,
        focusScore: stats ? (stats.focus_score || 0) : 0,
        isHosting: !!hostedRoom,
        isVerified: p.is_verified,
        roomCode: relevantRoom?.room_code,
        roomTitle: (relevantRoom?.name && relevantRoom.name !== "undefined") ? relevantRoom.name : "Sanctuary",
        roomDescription: (relevantRoom?.description && relevantRoom.description !== "undefined") ? relevantRoom.description : undefined,
        roomMode: relevantRoom?.mode,
        isPremium: p.is_premium || false,
        chumLabel: "Chum",
        gridX,
        gridY,
        gridZ,
        jitterX: isMe ? 0 : (getStableRandom(p.id, "jitterX") - 0.5) * 45,
        jitterY: isMe ? 0 : (getStableRandom(p.id, "jitterY") - 0.5) * 45,
        jitterZ: isMe ? 0 : (getStableRandom(p.id, "jitterZ") - 0.5) * 45,
        avatarUrl: p.avatar_url || undefined,
        activeBaseColor: isMe ? undefined : (wardrobe?.active_chum_base_color || 'base7'),
        activeAccessories: isMe ? undefined : finalAccessories,
        useChumAvatar: true
    };
};

export default function LanternNetPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const {
        totalSessions, activeMode, isTutorModeActive, isDev,
        debrisSize, debrisColor, debrisCount, debrisSpread, setDebris,
        mockUsers, setMockUsers, isPremiumUser, setSettings, totalSecondsTracked, isVerified, triggerChumToast,
        activeAppTheme, broadcasts, fetchBroadcasts, sparkBroadcast
    } = useStudyStore();
    const router = useRouter();
    const { isGamified } = useTerms();

    const [fullNetwork, setFullNetwork] = useState<LanternUser[]>([]);
    const [isNetworkLoading, setIsNetworkLoading] = useState(true);
    const isFirstLoad = useRef(true);
    const lanternRef = useRef<LanternNetHandle>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

    // --- NETWORK CORE & DEV ASSETS ---
    // Dev-only assets should be placed in `src/config/devAssets.ts` or
    // appended to the dictionaries in the Room page when `enableDevRoomOptions` is true.

    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<'chums' | 'rooms'>('chums');
    const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
    const [hostRoomType, setHostRoomType] = useState<'study' | 'canvas'>('study');

    // 🌐 SOCIAL FEATURES STATE
    const [isFriendRequestModalOpen, setIsFriendRequestModalOpen] = useState(false);
    const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
    const [isFormPactModalOpen, setIsFormPactModalOpen] = useState(false);
    const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'ranking' | 'friends'>('ranking');
    const [statusFilter, setStatusFilter] = useState<LanternUser['status'] | 'all'>('all');
    const { friends, friendRequests, pacts, fetchFriends, fetchFriendRequests, fetchPacts } = useStudyStore();
    const [isFriendsLoading, setIsFriendsLoading] = useState(false);
    const [isPactsLoading, setIsPactsLoading] = useState(false);
    const [activeRooms, setActiveRooms] = useState<RawRoom[]>([]);

    useEffect(() => {
        fetchBroadcasts(50, 0);
    }, [fetchBroadcasts]);

    // Load friend requests on mount
    useEffect(() => {
        fetchFriendRequests().catch(() => {
            // Silently ignore when unauthenticated or when tables are not yet provisioned.
        });
        fetchPacts().catch(() => {
            // Silently ignore when unauthenticated or when tables are not yet provisioned.
        });
    }, [fetchFriendRequests]);

    useEffect(() => {
        setSettings({ isSidebarHidden: isMaximized });
    }, [isMaximized, setSettings]);

    const [roomSettings, setRoomSettings] = useState({
        title: "Deep Work Session",
        description: "",
        mode: 'flowstate' as 'flowstate' | 'cafe',
        capacity: 4,
        isLocked: false,
        password: "",
        workDuration: 25,
        breakDuration: 5
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSecondsTrackedRef = useRef(totalSecondsTracked);
    useEffect(() => { totalSecondsTrackedRef.current = totalSecondsTracked; }, [totalSecondsTracked]);

    useEffect(() => {
        let isSubscribed = true;
        let currentUserId: string | null = null;

        const fetchNetwork = async () => {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            if (!user || !isSubscribed) return;
            currentUserId = user.id;
            setCurrentUserId(user.id);

            if (isFirstLoad.current) {
                setIsNetworkLoading(true);
            }
            try {
                // Fetch all data in parallel
                const results = await Promise.all([
                    supabase.from('profiles').select('id, display_name, full_name, status, is_in_flowstate, active_session_type, is_premium, avatar_url, is_verified'),
                    supabase.from('rooms').select('*'),
                    supabase.from('user_stats').select('user_id, focus_score, total_seconds_tracked'),
                    supabase.from('chum_wardrobe').select('user_id, active_accessories, active_chum_base_color'),
                ]);

                const [profilesRes, roomsRes, statsRes, wardrobeRes] = results;

                if (profilesRes.data && isSubscribed) {
                    const rooms = roomsRes.data || [];
                    const statsMap = new Map((statsRes.data || []).map(s => [s.user_id, s]));
                    const wardrobeMap = new Map((wardrobeRes.data || []).map(w => [w.user_id, w]));

                    const users: LanternUser[] = profilesRes.data.map((p, index) => {
                        const mergedProfile = {
                            ...p,
                            user_stats: statsMap.get(p.id) || null,
                            chum_wardrobe: wardrobeMap.get(p.id) || null
                        } as RawProfile;

                        if (p.id === currentUserId) {
                            return formatUser({
                                ...mergedProfile,
                                user_stats: {
                                    ...(mergedProfile.user_stats || {}),
                                    total_seconds_tracked: totalSecondsTrackedRef.current // Use current ref value
                                },
                                is_in_flowstate: activeMode === 'flowState',
                                active_session_type: isTutorModeActive ? 'AI_TUTOR' : null,
                                status: activeMode === 'none' ? 'idle' : activeMode
                            }, rooms, currentUserId, index);
                        }
                        return formatUser(mergedProfile, rooms, currentUserId, index);
                    });
                    setFullNetwork(users);
                    setActiveRooms(rooms);
                }
            } catch (err) {
                console.error("Lantern Network Fetch Error:", err);
            } finally {
                if (isSubscribed) {
                    setIsNetworkLoading(false);
                    isFirstLoad.current = false;
                }
            }
        };

        fetchNetwork();

        const channel = supabase.channel('lantern_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
                if (isSubscribed) fetchNetwork();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
                if (isSubscribed) fetchNetwork();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats' }, () => {
                if (isSubscribed) fetchNetwork();
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }, [totalSessions, activeMode, isTutorModeActive]);

    const handleBroadcast = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        console.log('🚀 BROADCAST: Starting broadcast...');

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('🚀 BROADCAST: User:', user?.id, 'Auth error:', authError);

        if (!isVerified) {
            console.warn('⚠️ BROADCAST: User not verified');
            triggerChumToast?.("Access Denied: You must verify your spirit link (email) before broadcasting to the network.", "warning");
            setIsSubmitting(false);
            return;
        }

        if (!user || authError) {
            console.error('❌ BROADCAST: No user or auth error');
            alert("Session expired. Please log in again.");
            setIsSubmitting(false);
            return;
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log('🚀 BROADCAST: Generated room code:', roomCode);

        if (hostRoomType === 'canvas') {
            console.log('🚀 BROADCAST: Creating CANVAS room...');
            const { error } = await supabase.from('rooms').insert({
                room_code: roomCode,
                host_id: user.id,
                name: roomSettings.title,
                description: roomSettings.description,
                status: 'ACTIVE',
                work_duration: roomSettings.workDuration,
                break_duration: roomSettings.breakDuration,
                mode: 'canvas',
                capacity: roomSettings.capacity,
                is_private: false,
                password: null,
                vibe: 'canvas'
            });

            if (!error) {
                console.log('✅ BROADCAST: Canvas room created! Room code:', roomCode);
                const link = `${window.location.origin}/canvas?room=${roomCode}`;
                navigator.clipboard?.writeText(link).catch(() => undefined);
                triggerChumToast?.('Canvas room link copied.', 'success');

                // 🌐 Broadcast to the network!
                const { addBroadcast } = useStudyStore.getState();
                await addBroadcast(`${roomSettings.title}`, 'canvas-room', {
                    room_code: roomCode,
                    room_title: roomSettings.title,
                    room_description: roomSettings.description,
                    room_mode: 'canvas'
                }).catch(e => console.error("Broadcast failed:", e));

                console.log('🚀 BROADCAST: Redirecting to canvas room:', roomCode);
                router.push(`/canvas?room=${roomCode}`);
            } else {
                console.error("❌ BROADCAST: Canvas room insert error:", error?.message);
                alert("Architect error: Could not initialize canvas room.");
                setIsSubmitting(false);
            }
            return;
        }

        console.log('🚀 BROADCAST: Creating STUDY room...');
        const { error } = await supabase.from('rooms').insert({
            room_code: roomCode,
            host_id: user.id,
            name: roomSettings.title,
            description: roomSettings.description, // Added description
            status: 'DRAFT',
            work_duration: roomSettings.workDuration,
            break_duration: roomSettings.breakDuration,
            mode: roomSettings.mode,
            capacity: roomSettings.capacity,
            is_private: roomSettings.isLocked,
            password: roomSettings.isLocked ? roomSettings.password : null, // Added password
            vibe: 'default'
        });

        if (!error) {
            console.log('✅ BROADCAST: Study room created! Room code:', roomCode);
            // 🌐 Broadcast to the network!
            const { addBroadcast } = useStudyStore.getState();
            await addBroadcast(`${roomSettings.title}`, 'study-room', {
                room_code: roomCode,
                room_title: roomSettings.title,
                room_description: roomSettings.description,
                room_mode: roomSettings.mode
            }).catch(e => console.error("Broadcast failed:", e));

            router.push(`/room?code=${roomCode}&title=${encodeURIComponent(roomSettings.title)}`);
        } else {
            console.error("❌ BROADCAST: Study room insert error:", error?.message);
            alert("Sanctuary Blueprint error: Could not initialize study room.");
            setIsSubmitting(false);
        }
    };

    const combinedNetwork = [...fullNetwork, ...mockUsers];
    const filteredNetwork = combinedNetwork.filter(user =>
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.roomCode && user.roomCode.toLowerCase().includes(searchQuery.toLowerCase()))) &&
        (statusFilter === 'all' || user.status === statusFilter)
    );

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    return (
        <div data-theme={activeAppTheme} className={`flex flex-col lg:flex-row h-screen max-h-screen ${isMaximized ? 'p-0 gap-0' : 'p-4 pb-8 lg:p-6 lg:pb-10 gap-6'} bg-(--bg-dark) overflow-hidden relative`}>


            <AnimatePresence>
                {isHostModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsHostModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-(--bg-card) border border-(--border-color) rounded-[40px] w-full max-w-4xl shadow-2xl relative z-10 flex flex-col lg:flex-row h-auto max-h-[90vh] overflow-y-auto lg:overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>

                            {/* LEFT SIDE: Identity */}
                            <div className="flex-1 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-(--border-color) overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-black text-(--text-main) flex items-center gap-3">
                                        <Plus className="text-(--accent-teal)" size={28} /> Cast a Lantern
                                    </h2>
                                    <button onClick={() => setIsHostModalOpen(false)} className="lg:hidden text-(--text-muted) hover:text-(--text-main) p-2 hover:bg-(--bg-dark) rounded-xl transition-all"><X size={20} /></button>
                                </div>

                                <div className="flex bg-(--bg-dark) p-1.5 rounded-2xl border border-(--border-color) mb-8">
                                    <button
                                        onClick={() => setHostRoomType('study')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${hostRoomType === 'study'
                                            ? 'bg-(--accent-teal) text-white shadow-lg'
                                            : 'text-(--text-muted) hover:text-white'}`}
                                    >
                                        Study Room
                                    </button>
                                    <button
                                        onClick={() => setHostRoomType('canvas')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${hostRoomType === 'canvas'
                                            ? 'bg-(--accent-teal) text-white shadow-lg'
                                            : 'text-(--text-muted) hover:text-white'}`}
                                    >
                                        Canvas Room
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">{hostRoomType === 'canvas' ? 'Canvas Blueprint Title' : 'Room Blueprint Title'}</label>
                                        <input autoFocus type="text" placeholder="e.g., Deep Focus Chamber" value={roomSettings.title} onChange={e => setRoomSettings({ ...roomSettings, title: e.target.value })}
                                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm font-bold text-(--text-main) outline-none focus:border-(--accent-teal) transition-all placeholder:text-(--text-muted)/30" />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">Description (Optional)</label>
                                        <textarea placeholder="Tell the network what you're working on..." rows={4} maxLength={30} value={roomSettings.description} onChange={e => setRoomSettings({ ...roomSettings, description: e.target.value })}
                                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm font-bold text-(--text-main) outline-none focus:border-(--accent-teal) transition-all resize-none custom-scrollbar placeholder:text-(--text-muted)/30" />
                                        <div className="flex justify-end px-1">
                                            <span className={`text-[10px] font-bold ${roomSettings.description.length >= 30 ? 'text-red-500' : 'text-(--text-muted)'}`}>
                                                {roomSettings.description.length}/30
                                            </span>
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* RIGHT SIDE: Parameters & Premium */}
                            <div className="w-full lg:w-[420px] bg-(--bg-sidebar)/30 p-8 lg:p-12 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                                <div className="space-y-10">
                                    <div className="hidden lg:flex justify-between items-center">
                                        <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest">Architect Controls</span>
                                        <button onClick={() => setIsHostModalOpen(false)} className="text-(--text-muted) hover:text-(--text-main) p-2 hover:bg-(--bg-dark) rounded-xl transition-all"><X size={20} /></button>
                                    </div>

                                    {hostRoomType === 'canvas' && (
                                        <div className="rounded-3xl border border-(--border-color) bg-(--bg-dark)/50 p-5 text-xs text-(--text-muted) leading-relaxed">
                                            Canvas rooms skip timers, capacity, and passwords for now. Share the room link to collaborate live.
                                        </div>
                                    )}

                                    {/* Capacity Slider */}
                                    <div className={`space-y-4 group transition-all ${!isPremiumUser || hostRoomType === 'canvas' ? 'cursor-not-allowed opacity-50' : ''}`}>
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest flex items-center gap-2">
                                                Room Capacity {!isPremiumUser && <span className="text-[8px] bg-(--accent-teal)/10 text-(--accent-teal) px-1.5 py-0.5 rounded-full">PREMIUM</span>}
                                            </label>
                                            <span className="text-xl font-black text-(--accent-teal)">{roomSettings.capacity}</span>
                                        </div>
                                        <div className="relative px-1">
                                            <input
                                                type="range"
                                                min="2"
                                                max={isPremiumUser ? 9 : 3}
                                                step="1"
                                                value={roomSettings.capacity > (isPremiumUser ? 9 : 3) ? (isPremiumUser ? 9 : 3) : roomSettings.capacity}
                                                onChange={e => setRoomSettings({ ...roomSettings, capacity: parseInt(e.target.value) })}
                                                disabled={hostRoomType === 'canvas'}
                                                className="w-full h-1.5 bg-(--border-color) rounded-full appearance-none cursor-pointer accent-(--accent-teal)"
                                            />
                                            <div className="flex justify-between mt-2 px-0.5">
                                                <span className="text-[9px] font-black text-(--text-muted)">MIN 2</span>
                                                <span className="text-[9px] font-black text-(--text-muted)">MAX {isPremiumUser ? 9 : 3}</span>
                                            </div>
                                        </div>
                                    </div>



                                    {/* Password Toggle & Input */}
                                    <div className={`space-y-4 p-6 rounded-3xl bg-(--bg-dark)/50 border border-(--border-color) transition-all ${!isPremiumUser || hostRoomType === 'canvas' ? 'opacity-50' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-1">
                                                <span className="text-xs font-black text-(--text-main) flex items-center gap-2">
                                                    Private Room {!isPremiumUser && <span className="text-[8px] bg-(--accent-teal)/10 text-(--accent-teal) px-1.5 py-0.5 rounded-full">PREMIUM</span>}
                                                </span>
                                                <span className="block text-[9px] text-(--text-muted) font-medium">Require room password</span>
                                            </div>
                                            <div onClick={() => isPremiumUser && hostRoomType !== 'canvas' && setRoomSettings({ ...roomSettings, isLocked: !roomSettings.isLocked })}
                                                className={`w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300 ${roomSettings.isLocked ? 'bg-(--accent-teal)' : 'bg-(--bg-card) border border-(--border-color)'} ${!isPremiumUser || hostRoomType === 'canvas' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <div className={`w-3 h-3 rounded-full transition-transform duration-300 ${roomSettings.isLocked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-(--text-muted)'}`} />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {roomSettings.isLocked && isPremiumUser && hostRoomType !== 'canvas' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2">
                                                    <input type="password" placeholder="Define room password" value={roomSettings.password} onChange={e => setRoomSettings({ ...roomSettings, password: e.target.value })}
                                                        className="w-full bg-(--bg-dark) border border-(--border-color) rounded-xl px-4 py-3 text-xs font-bold text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <SquishyButton onClick={handleBroadcast} disabled={isSubmitting || !roomSettings.title.trim() || (roomSettings.isLocked && !roomSettings.password && hostRoomType !== 'canvas')}
                                        className="w-full py-5 bg-(--accent-teal) text-white rounded-2xl font-black text-sm shadow-[0_10px_30px_-10px_rgba(20,184,166,0.5)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                                        {isSubmitting ? "Initializing Blueprint..." : hostRoomType === 'canvas' ? "Launch Canvas Room" : "Broadcast to Net"}
                                    </SquishyButton>
                                    <p className="text-center text-[9px] text-(--text-muted) font-black uppercase tracking-widest mt-4">Safe connection established</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MOBILE SIDEBAR TOGGLE */}
            <div className="lg:hidden fixed bottom-24 right-6 z-50">
                <button
                    onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
                    className="w-14 h-14 bg-(--accent-teal) text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                >
                    {isSidebarOpenMobile ? <X size={24} /> : <Trophy size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {(isSidebarOpenMobile || !isMaximized) && (
                    <motion.div
                        initial={isSidebarOpenMobile ? { x: '100%' } : { x: 0 }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className={`fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-10 ${isSidebarOpenMobile
                            ? 'bg-(--bg-dark)/95 backdrop-blur-xl p-6 pt-12'
                            : 'hidden lg:flex'
                            } w-full lg:w-[340px] flex-col gap-6 h-full shrink-0 min-h-0`}
                    >
                        {/* MOBILE CLOSE */}
                        {isSidebarOpenMobile && (
                            <button onClick={() => setIsSidebarOpenMobile(false)} className="absolute top-6 right-6 text-(--text-muted)">
                                <X size={28} />
                            </button>
                        )}

                        {/* HEADER & SEARCH SECTION */}
                        <div className="bg-(--bg-card) border border-(--border-color) p-4 rounded-[26px] shadow-sm flex flex-col gap-3 shrink-0">
                            <h1 className="text-lg font-black text-(--text-main) flex items-center gap-2">
                                <Radio size={18} className="text-(--accent-teal)" /> Lantern Net
                            </h1>
                            <div className="relative w-full">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder={isGamified ? "Find a Lantern..." : "Find a Room..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl pl-10 pr-4 py-2.5 text-[12px] font-bold outline-none focus:border-(--accent-teal) transition-all"
                                />
                            </div>

                            {/* 🌐 STATUS FILTER */}
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-(--text-muted) uppercase tracking-widest px-1">
                                    Filter by Status
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <SquishyButton
                                        onClick={() => setStatusFilter('all')}
                                        className={`py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            statusFilter === 'all'
                                                ? 'bg-(--accent-teal) text-white shadow-lg'
                                                : 'bg-(--bg-dark) text-(--text-muted) border border-(--border-color) hover:text-white'
                                        }`}
                                    >
                                        All
                                    </SquishyButton>
                                    <SquishyButton
                                        onClick={() => setStatusFilter('hosting')}
                                        className={`py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            statusFilter === 'hosting'
                                                ? 'bg-yellow-500 text-black shadow-lg'
                                                : 'bg-(--bg-dark) text-(--text-muted) border border-(--border-color) hover:text-white'
                                        }`}
                                    >
                                        Hosting
                                    </SquishyButton>
                                    <SquishyButton
                                        onClick={() => setStatusFilter('flowState')}
                                        className={`py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            statusFilter === 'flowState'
                                                ? 'bg-cyan-500 text-black shadow-lg'
                                                : 'bg-(--bg-dark) text-(--text-muted) border border-(--border-color) hover:text-white'
                                        }`}
                                    >
                                        Flow
                                    </SquishyButton>
                                    <SquishyButton
                                        onClick={() => setStatusFilter('joined')}
                                        className={`py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                            statusFilter === 'joined'
                                                ? 'bg-lime-500 text-black shadow-lg'
                                                : 'bg-(--bg-dark) text-(--text-muted) border border-(--border-color) hover:text-white'
                                        }`}
                                    >
                                        Joined
                                    </SquishyButton>
                                </div>
                            </div>

                            <SquishyButton
                                id="lantern-host-trigger"
                                onClick={() => setIsHostModalOpen(true)}
                                className="w-full py-3 bg-(--accent-teal)/10 border-2 border-dashed border-(--accent-teal)/30 rounded-2xl text-(--accent-teal) text-[10px] font-black uppercase tracking-widest hover:bg-(--accent-teal)/20 hover:border-(--accent-teal) transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> {isGamified ? "Light a Beacon" : "Host a Room"}
                            </SquishyButton>

                            {/* 🌐 SOCIAL FEATURES BUTTONS */}
                            <div className="grid grid-cols-2 gap-3">
                                <SquishyButton
                                    onClick={() => setIsAddFriendModalOpen(true)}
                                    className="py-2.5 px-3 bg-(--accent-yellow)/10 border border-(--accent-yellow)/30 rounded-2xl text-(--accent-yellow) text-[10px] font-black uppercase tracking-widest hover:bg-(--accent-yellow)/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Users size={14} /> Add Friend
                                </SquishyButton>
                                <SquishyButton
                                    onClick={() => {
                                        setIsFormPactModalOpen(true);
                                        setIsFriendsLoading(true);
                                        setIsPactsLoading(true);
                                        Promise.all([
                                            fetchFriends().catch(() => {}),
                                            fetchPacts().catch(() => {}),
                                        ]).finally(() => {
                                            setIsFriendsLoading(false);
                                            setIsPactsLoading(false);
                                        });
                                    }}
                                    className="py-2.5 px-3 bg-(--accent-cyan)/10 border border-(--accent-cyan)/30 rounded-2xl text-(--accent-cyan) text-[10px] font-black uppercase tracking-widest hover:bg-(--accent-cyan)/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={14} /> {pacts.length > 0 ? 'View Current Pact' : 'Form Pact'}
                                </SquishyButton>
                            </div>

                            {/* Friend Requests Badge */}
                            {friendRequests.length > 0 && (
                                <SquishyButton
                                    onClick={() => setIsFriendRequestModalOpen(true)}
                                    className="w-full py-3 px-4 bg-primary/10 border border-primary/30 rounded-2xl text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-between gap-2"
                                >
                                    <span>Pending Requests</span>
                                    <span className="bg-primary text-primary-content px-2 py-0.5 rounded-full text-[10px]">
                                        {friendRequests.length}
                                    </span>
                                </SquishyButton>
                            )}
                        </div>

                        {/* TABS CONTAINER (The Conflict Fix) */}
                        <div className="bg-(--bg-card) border border-(--border-color) rounded-[26px] p-4 flex-1 flex flex-col min-h-0 shadow-sm gap-3 overflow-hidden">

                            {/* SWITCHER */}
                            <div className="flex bg-(--bg-dark) p-1 rounded-2xl border border-(--border-color) shrink-0">
                                <button
                                    onClick={() => setActiveTab('chums')}
                                    className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'chums' ? 'bg-(--accent-teal) text-white shadow-lg' : 'text-(--text-muted) hover:text-white'}`}
                                >
                                    {isGamified ? "Chums" : "People"}
                                </button>
                                <button
                                    onClick={() => setActiveTab('rooms')}
                                    className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'rooms' ? 'bg-(--accent-teal) text-white shadow-lg' : 'text-(--text-muted) hover:text-white'}`}
                                >
                                    {isGamified ? "Lanterns" : "Rooms"}
                                </button>
                            </div>

                            {/* TAB CONTENT (Scrollable) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'chums' ? (
                                        <motion.div
                                            key="chums"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-2"
                                        >
                                            <div id="lantern-leaderboard" className="flex flex-col min-h-0 flex-1">
                                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-(--border-color)">
                                                    <h3 className="text-sm font-black text-(--text-main) flex items-center gap-2 uppercase tracking-wide">
                                                        <Trophy size={18} className="text-(--accent-yellow)" /> {isGamified ? "The Lumina Archive" : "Leaderboard"}
                                                    </h3>
                                                </div>

                                                {/* Leaderboard Tabs */}
                                                <div className="flex bg-(--bg-dark) p-1 rounded-2xl border border-(--border-color) mb-2 shrink-0">
                                                    <button
                                                        onClick={() => setActiveLeaderboardTab('ranking')}
                                                        className={`flex-1 py-1.5 text-[7px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                                            activeLeaderboardTab === 'ranking'
                                                                ? 'bg-(--accent-teal) text-white shadow-lg'
                                                                : 'text-(--text-muted) hover:text-white'
                                                        }`}
                                                    >
                                                        Top 10
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveLeaderboardTab('friends');
                                                            setIsFriendsLoading(true);
                                                            fetchFriends()
                                                                .catch(() => {})
                                                                .finally(() => setIsFriendsLoading(false));
                                                        }}
                                                        className={`flex-1 py-1.5 text-[7px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                                            activeLeaderboardTab === 'friends'
                                                                ? 'bg-(--accent-teal) text-white shadow-lg'
                                                                : 'text-(--text-muted) hover:text-white'
                                                        }`}
                                                    >
                                                        Friends
                                                    </button>
                                                </div>

                                                <div className="relative">
                                                    {!isVerified && (
                                                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-(--bg-card)/40 rounded-2xl border border-(--border-color) shadow-2xl">
                                                            <div className="w-12 h-12 rounded-full bg-red-400/10 text-red-400 border border-red-400/30 flex items-center justify-center mb-4">
                                                                <ShieldAlert size={24} />
                                                            </div>
                                                            <h4 className="text-sm font-black text-(--text-main) mb-2 uppercase tracking-tight">Identity Unverified</h4>
                                                            <p className="text-[10px] font-bold text-(--text-muted) mb-4 leading-relaxed">
                                                                The Hall of Focus is shielded. Verify your spirit link to witness the network hierarchy.
                                                            </p>
                                                            <button
                                                                onClick={() => router.push('/account')}
                                                                className="w-full py-2 bg-red-400/10 text-red-400 border border-red-400/30 rounded-xl text-[10px] font-black uppercase hover:bg-red-400/20 transition-all"
                                                            >
                                                                Verification Relay
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className={`space-y-2 ${!isVerified ? 'blur-sm select-none pointer-events-none grayscale' : ''}`}>
                                                        {activeLeaderboardTab === 'ranking' ? (
                                                            // TOP 10 RANKING
                                                            <>
                                                                {isNetworkLoading ? (
                                                                    Array.from({ length: 3 }).map((_, i) => (
                                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-dark)/30 animate-pulse">
                                                                            <div className="w-5 h-4 bg-(--border-color) rounded" />
                                                                            <div className="flex-1 h-4 bg-(--border-color) rounded w-24" />
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    filteredNetwork.sort((a, b) => b.hours - a.hours).slice(0, 10).map((user, index) => (
                                                                        <div
                                                                            key={user.id}
                                                                            className={`group/row flex items-center gap-3 p-3 rounded-2xl border transition-all ${user.id === 'me' ? 'bg-(--accent-teal)/10 border-(--accent-teal)/20' : 'bg-transparent border-transparent hover:border-(--border-color) hover:bg-(--bg-dark)'}`}
                                                                        >
                                                                            <span className={`text-xs font-black w-5 text-center ${index < 3 ? 'text-(--accent-yellow)' : 'text-(--text-muted)'}`}>
                                                                                {index + 1}
                                                                            </span>
                                                                            <div className="w-8 h-8 rounded-full border border-(--border-color) shrink-0 bg-(--bg-dark) overflow-hidden flex items-center justify-center p-0.5 relative">
                                                                                {!user.useChumAvatar && user.avatarUrl ? (
                                                                                    <img
                                                                                        src={user.avatarUrl}
                                                                                        alt="PFP"
                                                                                        className="w-full h-full object-cover z-20 relative rounded-full"
                                                                                        onError={(e) => {
                                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                                            const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-chum');
                                                                                            if (fallback) fallback.classList.remove('invisible');
                                                                                        }}
                                                                                    />
                                                                                ) : null}
                                                                                <div className={`absolute inset-0 flex items-center justify-center p-0.5 fallback-chum ${(!user.useChumAvatar && user.avatarUrl) ? 'invisible' : ''}`}>
                                                                                    <ChumRenderer
                                                                                        size="w-full h-full"
                                                                                        baseColorIdOverride={user.activeBaseColor}
                                                                                        activeAccessoriesOverride={user.activeAccessories}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-1 flex flex-col overflow-hidden">
                                                                                <span className="text-sm font-black text-(--text-main) truncate">{user.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <button
                                                                                    disabled={!isVerified}
                                                                                    onClick={() => { lanternRef.current?.warpToUser(user.id); setIsSidebarOpenMobile(false); }}
                                                                            className="lg:opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-(--accent-teal)/10 text-(--text-muted) hover:text-(--accent-teal) disabled:opacity-0"
                                                                        >
                                                                            <Crosshair size={14} />
                                                                        </button>
                                                                        <span className="text-xs font-black text-(--text-muted) bg-(--bg-dark) px-2 py-1 rounded-lg">
                                                                            {user.hours}h
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))                                                                )}
                                                            </>
                                                        ) : (
                                                            // FRIENDS LEADERBOARD
                                                            <>
                                                                {isFriendsLoading ? (
                                                                    Array.from({ length: 3 }).map((_, i) => (
                                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-dark)/30 animate-pulse">
                                                                            <div className="w-8 h-8 bg-(--border-color) rounded-full" />
                                                                            <div className="flex-1 h-4 bg-(--border-color) rounded w-24" />
                                                                            <div className="w-10 h-4 bg-(--border-color) rounded" />
                                                                        </div>
                                                                    ))
                                                                ) : friends.length === 0 ? (
                                                                    <div className="text-center py-8 text-(--text-muted)">
                                                                        <p className="text-xs font-bold">No friends yet</p>
                                                                        <button
                                                                            onClick={() => setIsAddFriendModalOpen(true)}
                                                                            className="mt-3 px-4 py-2 text-xs font-black text-success bg-success/10 rounded-lg hover:bg-success/20 transition-all"
                                                                        >
                                                                            Find Friends
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    friends.sort((a, b) => {
                                                                        // Get the friend's lantern user data from the network
                                                                        const friendAId = a.user_id_2 || a.user_id_1;
                                                                        const friendBId = b.user_id_2 || b.user_id_1;
                                                                        const aUser = filteredNetwork.find(u => u.id === friendAId);
                                                                        const bUser = filteredNetwork.find(u => u.id === friendBId);
                                                                        return (bUser?.hours ?? 0) - (aUser?.hours ?? 0);
                                                                    }).map((friendship) => {
                                                                        const friendId = friendship.user_id_2 || friendship.user_id_1;
                                                                        const friendData = friendship.profiles_2 || friendship.profiles_1;
                                                                        const friendUser = filteredNetwork.find(u => u.id === friendId);
                                                                        const hours = friendUser?.hours || 0;

                                                                        return (
                                                                            <div
                                                                                key={friendship.id}
                                                                                className="group/row flex items-center gap-3 p-3 rounded-2xl border bg-transparent border-transparent hover:border-(--border-color) hover:bg-(--bg-dark) transition-all"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full border border-(--border-color) shrink-0 bg-(--bg-dark) overflow-hidden flex items-center justify-center p-0.5 relative">
                                                                                    {(!friendUser?.useChumAvatar && friendData?.avatar_url) ? (
                                                                                        <img
                                                                                            src={friendData.avatar_url}
                                                                                            alt={friendData.display_name}
                                                                                            className="w-full h-full object-cover z-20 relative rounded-full"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="absolute inset-0 flex items-center justify-center p-0.5">
                                                                                            <ChumRenderer
                                                                                                size="w-full h-full"
                                                                                                baseColorIdOverride={friendUser?.activeBaseColor}
                                                                                                activeAccessoriesOverride={friendUser?.activeAccessories}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 flex flex-col overflow-hidden">
                                                                                    <span className="text-sm font-black text-(--text-main) truncate">
                                                                                        {friendData?.display_name || 'Unknown'}
                                                                                    </span>
                                                                                    <span className="text-xs text-(--text-muted)">
                                                                                        {friendData?.status || 'offline'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <button
                                                                                        disabled={!isVerified}
                                                                                        onClick={() => { lanternRef.current?.warpToUser(friendId); setIsSidebarOpenMobile(false); }}
                                                                                        className="lg:opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-(--accent-teal)/10 text-(--text-muted) hover:text-(--accent-teal) disabled:opacity-0"
                                                                                    >
                                                                                        <Crosshair size={14} />
                                                                                    </button>
                                                                                    <span className="text-xs font-black text-(--text-muted) bg-(--bg-dark) px-2 py-1 rounded-lg">
                                                                                        {hours}h
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </>                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="rooms"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-3 flex flex-col h-full"
                                        >
                                            <div className="flex flex-col min-h-0 pb-8 flex-1 overflow-y-auto custom-scrollbar">
                                                <h3 className="text-sm font-black text-(--text-main) flex items-center gap-2 mb-4 pb-4 border-b border-(--border-color) uppercase tracking-wide">
                                                    <Radio size={18} className="text-(--accent-teal)" /> active Sanctuaries
                                                </h3>
                                                <div className="space-y-3">
                                                    {broadcasts.filter(b => b.broadcast_type === 'study-room' || b.broadcast_type === 'canvas-room').map((broadcast: any) => {
                                                        const isCanvas = broadcast.broadcast_type === 'canvas-room';
                                                        const roomCode = broadcast.metadata?.room_code;
                                                        const roomTitle = broadcast.metadata?.room_title || broadcast.content;
                                                        const roomDesc = broadcast.metadata?.room_description;
                                                        const hostProfile = broadcast.profiles;
                                                        
                                                        // Check if room is still active
                                                        const isRoomActive = activeRooms.some(r => r.room_code === roomCode && (r.status === 'ACTIVE' || r.status === 'DRAFT'));
                                                        const hostName = (hostProfile?.display_name && hostProfile.display_name.trim() !== "") 
                                                            ? hostProfile.display_name 
                                                            : (hostProfile?.full_name && hostProfile.full_name.trim() !== "") 
                                                            ? hostProfile.full_name 
                                                            : "Anonymous";

                                                        // Chum avatar props
                                                        const wardrobe = Array.isArray(hostProfile?.chum_wardrobe) ? hostProfile.chum_wardrobe[0] : hostProfile?.chum_wardrobe;
                                                        let rawAccessories = wardrobe?.active_accessories;
                                                        if (typeof rawAccessories === 'string') {
                                                            try { rawAccessories = JSON.parse(rawAccessories); } catch (e) { rawAccessories = []; }
                                                        }
                                                        const finalAccessories = Array.isArray(rawAccessories) ? rawAccessories : [];

                                                        return (
                                                            <div key={broadcast.id} className="p-4 rounded-3xl bg-(--bg-dark)/50 border border-(--border-color) hover:border-(--accent-teal)/20 transition-all group/room">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <h4 className="text-xs font-black text-white truncate">{roomTitle}</h4>
                                                                        {roomDesc && <p className="text-[10px] text-(--text-muted) italic line-clamp-1">&quot;{roomDesc}&quot;</p>}
                                                                    </div>
                                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${isCanvas ? 'bg-(--accent-cyan)/10 text-(--accent-cyan)' : 'bg-(--accent-teal)/10 text-(--accent-teal)'}`}>
                                                                        {isCanvas ? 'Canvas' : 'Study'}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex items-center justify-between mt-3">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="w-6 h-6 rounded-full border border-(--border-color) shrink-0 bg-(--bg-dark) overflow-hidden flex items-center justify-center p-0.5 relative">
                                                                            {hostProfile?.avatar_url ? (
                                                                                <img src={hostProfile.avatar_url} alt="Host" className="w-full h-full object-cover rounded-full" />
                                                                            ) : (
                                                                                <ChumRenderer 
                                                                                    size="w-full h-full"
                                                                                    baseColorIdOverride={wardrobe?.active_chum_base_color}
                                                                                    activeAccessoriesOverride={finalAccessories}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-(--text-muted) truncate">By {hostName}</span>
                                                                    </div>
                                                                    
                                                                    <SquishyButton
                                                                        onClick={() => {
                                                                            if (isRoomActive) {
                                                                                router.push(isCanvas ? `/canvas?room=${roomCode}` : `/room?code=${roomCode}`);
                                                                            }
                                                                        }}
                                                                        disabled={!isRoomActive}
                                                                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                                            isRoomActive 
                                                                                ? 'bg-(--accent-teal) text-black hover:scale-105 active:scale-95 shadow-[0_5px_15px_-5px_rgba(45,212,191,0.4)]'
                                                                                : 'bg-(--bg-dark) text-(--text-muted) border border-(--border-color) cursor-not-allowed opacity-50'
                                                                        }`}
                                                                    >
                                                                        {isRoomActive ? 'Join' : 'Expired'}
                                                                    </SquishyButton>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {broadcasts.filter(b => b.broadcast_type === 'study-room' || b.broadcast_type === 'canvas-room').length === 0 && (
                                                        <div className="text-center p-8 opacity-30">
                                                            <Radio size={32} className="mx-auto mb-2" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">No room broadcasts yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>

                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div id="lantern-map-container" className={`flex-1 h-full ${isMaximized ? 'rounded-none border-none' : 'rounded-[40px] border border-(--border-color) shadow-xl'} overflow-hidden relative min-h-0`}>
                {!isVerified && (
                    <div className="absolute inset-0 z-[100] bg-(--bg-dark)/80 backdrop-blur-md flex items-center justify-center p-8 text-center">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md space-y-6">
                            <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500/40 rounded-full flex items-center justify-center mx-auto text-red-400">
                                <ShieldAlert size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Neural Link Unverified</h2>
                            <p className="text-sm text-(--text-muted) leading-relaxed font-bold">
                                The Lantern Network requires a verified spirit link to prevent interference. Check your neural archives (email) to confirm your identity.
                            </p>
                            <button onClick={() => router.push('/account')} className="px-8 py-4 bg-(--accent-teal) text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                                Verify Identity
                            </button>
                        </motion.div>
                    </div>
                )}
                <ThreeLanternNet
                    ref={lanternRef}
                    users={combinedNetwork}
                    isInitialLoading={isNetworkLoading}
                    isMaximized={isMaximized}
                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                    debrisSize={debrisSize}
                    debrisColor={debrisColor}
                    debrisCount={debrisCount}
                    debrisSpread={debrisSpread}
                    pacts={pacts as Pact[]}
                    currentUserId={currentUserId}
                />
            </div>

            {/* 🌐 SOCIAL MODALS */}
            <FriendRequestModal
                isOpen={isFriendRequestModalOpen}
                onClose={() => setIsFriendRequestModalOpen(false)}
            />
            <AddFriendModal
                isOpen={isAddFriendModalOpen}
                onClose={() => setIsAddFriendModalOpen(false)}
            />
            <FormPactModal
                isOpen={isFormPactModalOpen}
                onClose={() => setIsFormPactModalOpen(false)}
                friendsList={friends}
                isFriendsLoading={isFriendsLoading}
                isPactsLoading={isPactsLoading}
                currentUserId={currentUserId}
                currentPact={pacts[0] as Pact | undefined}
            />
        </div >
    );
}



"use client";

import { useStudyStore, AppNotification } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Zap, Cpu, Calendar, CheckCircle2, AlertTriangle, Info, Trash2 } from "lucide-react";
import { useState } from "react";

export default function NotificationCenter() {
    const { 
        notifications, 
        isNotificationCenterOpen, 
        setIsNotificationCenterOpen,
        markNotificationRead,
        clearNotifications
    } = useStudyStore();

    const [activeTab, setActiveTab] = useState<'activity' | 'system'>('activity');

    const filteredNotifications = notifications.filter(n => n.category === activeTab);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const unreadActivity = notifications.filter(n => n.category === 'activity' && !n.isRead).length;
    const unreadSystem = notifications.filter(n => n.category === 'system' && !n.isRead).length;

    if (!isNotificationCenterOpen) return null;

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-emerald-400" size={16} />;
            case 'warning': return <AlertTriangle className="text-amber-400" size={16} />;
            case 'error': return <AlertTriangle className="text-rose-400" size={16} />;
            default: return <Info className="text-cyan-400" size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 pointer-events-none">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationCenterOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-(--bg-card) border border-(--border-color) rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[80vh]"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-(--border-color) flex items-center justify-between bg-gradient-to-r from-(--bg-sidebar) to-(--bg-card)">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-(--accent-teal)/10 text-(--accent-teal) border border-(--accent-teal)/20">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-(--text-main) tracking-tight">Notification Center</h2>
                            <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                                {unreadCount > 0 ? `${unreadCount} unread transmissions` : 'Neural link clear'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsNotificationCenterOpen(false)}
                        className="p-2 hover:bg-(--border-color) rounded-full transition-colors text-(--text-muted)"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex p-1 bg-(--bg-sidebar) border-b border-(--border-color)">
                    <button 
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'activity' ? 'bg-(--accent-teal) text-black shadow-lg shadow-(--accent-teal)/20' : 'text-(--text-muted) hover:text-(--text-main)'}`}
                    >
                        <Zap size={14} />
                        Activity
                        {unreadActivity > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('system')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'system' ? 'bg-(--accent-teal) text-black shadow-lg shadow-(--accent-teal)/20' : 'text-(--text-muted) hover:text-(--text-main)'}`}
                    >
                        <Cpu size={14} />
                        System
                        {unreadSystem > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 min-h-[300px]">
                    <AnimatePresence mode="popLayout">
                        {filteredNotifications.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12"
                            >
                                <div className="w-16 h-16 rounded-full bg-(--bg-sidebar) flex items-center justify-center mb-4 text-(--text-muted)/20 border border-(--border-color)">
                                    <Bell size={32} />
                                </div>
                                <h3 className="text-(--text-main) font-bold text-sm">No {activeTab} updates</h3>
                                <p className="text-(--text-muted) text-xs mt-1">Everything is in harmony.</p>
                            </motion.div>
                        ) : (
                            filteredNotifications.map((n) => (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 20, opacity: 0 }}
                                    onClick={() => markNotificationRead(n.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${n.isRead ? 'bg-transparent border-(--border-color)/30' : 'bg-(--accent-teal)/5 border-(--accent-teal)/20 border-l-4 border-l-(--accent-teal)'}`}
                                >
                                    <div className="flex gap-4">
                                        <div className="mt-1">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className={`text-sm font-bold truncate ${n.isRead ? 'text-(--text-muted)' : 'text-(--text-main)'}`}>{n.title}</h4>
                                                <span className="text-[10px] text-(--text-muted) font-mono whitespace-nowrap">
                                                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-(--text-muted) leading-relaxed">
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* FOOTER */}
                {filteredNotifications.length > 0 && (
                    <div className="p-4 border-t border-(--border-color) bg-(--bg-sidebar)/50 flex justify-center">
                        <button 
                            onClick={() => clearNotifications(activeTab)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-(--text-muted) hover:text-rose-400 transition-colors"
                        >
                            <Trash2 size={12} />
                            Purge Records
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

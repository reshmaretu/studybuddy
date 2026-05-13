"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Cloud, CloudOff } from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

// ⚡ THE SHIELD: Dynamically import Tldraw for Client-Side only
const TldrawComponent = dynamic(
    () => import("./TldrawSafe"), // Points to your safe wrapper
    { ssr: false } // Crucial: This disables server-side rendering for the engine
);

export default function ZenCanvas() {
    const channelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null);
    const [app, setApp] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [canvasId, setCanvasId] = useState("studybuddy-zen-canvas-guest");

    // Initialize state from localStorage safely
    const [autoSaveCloud, setAutoSaveCloud] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // ⚡ THE THEME FIX: Watch the DOM for changes to data-theme
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (!app) return;
            // Force Tldraw to re-evaluate its environment when the theme flips
            app.updateInstanceState({ isDebugMode: false });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => observer.disconnect();
    }, [app]);

    // Update localStorage when sync toggle changes
    useEffect(() => {
        localStorage.setItem('zen_cloud_sync', autoSaveCloud.toString());
    }, [autoSaveCloud]);

    // ⚡ Reactive ID for Persistence (Prevents leakage between user profiles)
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setCanvasId(`studybuddy-zen-canvas-${data.user.id}`);
        });
    }, []);

    // Load Snapshot from Supabase
    useEffect(() => {
        const loadFromCloud = async () => {
            if (!app) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('whiteboards')
                    .select('snapshot_data, user_id')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data?.snapshot_data) {
                    // Security Check: Verify ownership
                    if (data.user_id && data.user_id !== user.id) return;

                    // 👇 Pass the store as the first argument
                    loadSnapshot(app.store, data.snapshot_data);
                    toast.success("Welcome back to your Sanctuary.");
                }
            } catch (error) {
                console.error("Load Error:", error);
                toast.error("Could not retrieve cloud data.");
            }
        };

        loadFromCloud();
    }, [app]);

    const handleSave = async () => {
        if (!app || isSaving) return;
        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 👇 Wrap the store inside the standalone function
            const snapshot = getSnapshot(app.store);

            const { error } = await supabase
                .from('whiteboards')
                .upsert({
                    user_id: user.id,
                    snapshot_data: snapshot,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;
            toast.success("Cloud Sanctuary Updated");
        } catch (error) {
            console.error("Sync Error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save Interval Logic
    useEffect(() => {
        // We move the conditional logic INSIDE the hook, not the dependency array
        if (!autoSaveCloud || !app || !isMounted) return;

        const autoSaveInterval = setInterval(() => {
            handleSave();
        }, 30000);

        return () => clearInterval(autoSaveInterval);
    }, [autoSaveCloud, app, isMounted]); // Size is ALWAYS 3. Fixes the error.

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {/* 🎨 Positioned at Top-Center to avoid Tldraw UI collisions */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-(--bg-card)/80 backdrop-blur-2xl p-2 rounded-2xl border border-(--border-color) shadow-2xl">
                <button
                    onClick={() => setAutoSaveCloud(!autoSaveCloud)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-tighter ${autoSaveCloud
                        ? 'bg-(--accent-teal) text-(--bg-dark) shadow-[0_0_20px_var(--accent-teal)]'
                        : 'bg-(--bg-dark)/50 text-(--text-muted) hover:text-(--text-main)'
                        }`}
                >
                    {autoSaveCloud ? <Cloud size={14} /> : <CloudOff size={14} />}
                    {autoSaveCloud ? "SYNCING" : "LOCAL"}
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving || autoSaveCloud}
                    className="px-4 py-1.5 bg-(--text-main) text-(--bg-dark) rounded-xl hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                >
                    {isSaving ? "STASHING..." : "SAVE SNAPSHOT"}
                </button>
            </div>

            <TldrawComponent
                key={canvasId} // Forces a fresh mount when user ID changes
                id={canvasId}
                showMenu={true}
                onMount={(editor: any) => {
                    // 🔥 THE FIX: Wrap the state update in a timeout or requestAnimationFrame.
                    // This prevents React 19 from throwing a fit about "updating during mount"
                    // while it's still processing these legacy refs.
                    window.requestAnimationFrame(() => {
                        setApp(editor);
                    });
                }}
            />
        </div>
    );

}


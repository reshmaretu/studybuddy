"use client";

import { useCanvasStore } from "@/store/useCanvasStore";
import { MousePointer2, PenTool, Brain, Undo2, Redo2, Save, Square, Circle, MoveUpRight, Type, StickyNote, Eraser, Trash2 } from "lucide-react";

export default function CanvasToolbar({ onSave, isSaving }: { onSave?: () => void, isSaving?: boolean }) {
    // 🔥 Make sure we extract eraserSize and setEraserSize here!
    const {
        activeTool, setActiveTool, undo, redo,
        selectedElementIds, removeElements,
        eraserSize, setEraserSize
    } = useCanvasStore();

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 bg-[var(--bg-card)]/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-[var(--border-color)] shadow-2xl">
            {/* ─── PRIMARY TOOLS ─── */}
            <button onClick={() => setActiveTool('select')} className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Selection Tool">
                <MousePointer2 size={18} />
            </button>
            <button onClick={() => setActiveTool('pen')} className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Neural Pen">
                <PenTool size={18} />
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

            {/* ─── SHAPES & NODES ─── */}
            <button onClick={() => setActiveTool('node')} className={`p-3 rounded-xl transition-all ${activeTool === 'node' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Mindmap Shard">
                <Brain size={18} />
            </button>
            <button onClick={() => setActiveTool('rect')} className={`p-3 rounded-xl transition-all ${activeTool === 'rect' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Fragment Box">
                <Square size={18} />
            </button>
            <button onClick={() => setActiveTool('circle')} className={`p-3 rounded-xl transition-all ${activeTool === 'circle' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Essence Circle">
                <Circle size={18} />
            </button>
            <button onClick={() => setActiveTool('arrow')} className={`p-3 rounded-xl transition-all ${activeTool === 'arrow' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Flow Vector">
                <MoveUpRight size={18} />
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

            {/* ─── TEXT & ANNOTATION ─── */}
            <button onClick={() => setActiveTool('text')} className={`p-3 rounded-xl transition-all ${activeTool === 'text' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Transcribe Mode">
                <Type size={18} />
            </button>
            <button onClick={() => setActiveTool('sticky')} className={`p-3 rounded-xl transition-all ${activeTool === 'sticky' ? 'bg-[var(--accent-teal)] text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`} title="Focus Note">
                <StickyNote size={18} />
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

            {/* ─── DELETION TOOLS ─── */}
            <div className="relative flex items-center">
                <button
                    onClick={() => setActiveTool('eraser')}
                    className={`p-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-red-400 text-black font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]'}`}
                    title="Eraser Tool"
                >
                    <Eraser size={18} />
                </button>

                {/* 🔥 ERASER THICKNESS DROPDOWN 🔥 */}
                {activeTool === 'eraser' && (
                    <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 flex bg-[var(--bg-card)] border border-[var(--border-color)] p-2 rounded-xl shadow-2xl gap-2 z-[1000]">
                        {[10, 25, 50, 80].map(size => (
                            <button
                                key={size}
                                onClick={() => setEraserSize(size)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-red-400/20 ${eraserSize === size ? 'bg-red-400/20 shadow-inner ring-1 ring-red-400/50' : ''}`}
                                title={`Thickness: ${size}px`}
                            >
                                <div className="bg-red-400 rounded-full" style={{ width: size / 2.5, height: size / 2.5 }} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => { if (selectedElementIds.length > 0) removeElements(selectedElementIds); }}
                disabled={selectedElementIds.length === 0}
                className="p-3 rounded-xl text-red-400 hover:bg-red-400/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Delete Selected"
            >
                <Trash2 size={18} />
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

            {/* ─── HISTORY & SAVE ─── */}
            <button onClick={undo} className="p-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]" title="Revert Shift">
                <Undo2 size={18} />
            </button>
            <button onClick={redo} className="p-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]" title="Restore Shift">
                <Redo2 size={18} />
            </button>

            {onSave && (
                <>
                    <div className="w-px h-6 bg-[var(--border-color)] mx-1" />
                    <button onClick={onSave} disabled={isSaving} className="p-3 rounded-xl bg-[var(--accent-yellow)] text-black hover:scale-105 transition-all disabled:opacity-50" title="Sync Blueprint">
                        <Save size={18} />
                    </button>
                </>
            )}
        </div>
    );
}
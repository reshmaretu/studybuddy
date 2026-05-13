"use client";

import StudyCanvas from "@/components/canvas/StudyCanvas";
import { useCanvasStore } from "@/store/useCanvasStore";
import { Hammer, MousePointer2, PenTool, Brain, Undo2, Redo2 } from "lucide-react";

export default function CanvasTestPage() {
    const { activeTool, setActiveTool, undo, redo } = useCanvasStore();

    return (
        <div className="w-screen h-screen bg-(--bg-dark) flex flex-col">
            {/* TOOLBAR */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 bg-(--bg-card)/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-(--border-color) shadow-2xl">
                <button 
                    onClick={() => setActiveTool('select')}
                    className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                >
                    <MousePointer2 size={18} />
                </button>
                <button 
                    onClick={() => setActiveTool('pen')}
                    className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                >
                    <PenTool size={18} />
                </button>
                <button 
                    onClick={() => setActiveTool('node')}
                    className={`p-3 rounded-xl transition-all ${activeTool === 'node' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                >
                    <Brain size={18} />
                </button>
                
                <div className="w-px h-6 bg-(--border-color) mx-1" />

                <button onClick={undo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)">
                    <Undo2 size={18} />
                </button>
                <button onClick={redo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)">
                    <Redo2 size={18} />
                </button>
            </div>

            <StudyCanvas />

            <div className="absolute bottom-6 left-6 z-[100] bg-(--bg-card)/80 backdrop-blur-xl p-4 rounded-2xl border border-(--border-color) shadow-2xl max-w-xs transition-all pointer-events-none">
                <h3 className="text-sm font-bold text-(--text-main) flex items-center gap-2 mb-1">
                    <Hammer className="text-(--accent-yellow)" size={16} /> Mega-Engine Lab
                </h3>
                <p className="text-[10px] text-(--text-muted) leading-relaxed">
                    This is your centralized canvas. It uses one unified engine to handle freehand drawing (Adobe-style) and nodes (Mindmap-style) in a single high-performance stage.
                </p>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Coffee, Waves, Lock, FileSignature, Timer } from "lucide-react";
import { useStudyStore } from "@studybuddy/api";
import { SquishyButton } from "./SquishyButton";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";


export const FocusModal = () => {
    const {
        isFocusModalOpen, closeFocusModal, focusTaskId, tasks,
        pomodoroFocus, pomodoroShortBreak, pomodoroLongBreak, pomodoroCycles, updatePomodoroSettings
    } = useStudyStore();

    const [selectedId, setSelectedId] = useState<string | null>(focusTaskId || null);
    const [contractMode, setContractMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPomodoroSettingsOpen, setIsPomodoroSettingsOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const activeTasks = tasks.filter(t => !t.isCompleted && t.id !== selectedId && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedTask = tasks.find(t => t.id === selectedId);

    const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string);
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (event.over && event.over.id === "focus-crucible") setSelectedId(event.active.id as string);
    };
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: (typeof window !== 'undefined' && 
                ((window as any).Capacitor?.isNativePlatform?.() || 'ontouchstart' in window)) 
                ? { delay: 250, tolerance: 20 }
                : { distance: 10 }
        })
    );

    const CrucibleDropZone = () => {
        const { isOver, setNodeRef } = useDroppable({ id: "focus-crucible" });
        return (
            <div ref={setNodeRef} className={`h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${isOver ? "border-dashed border-(--accent-teal) bg-(--accent-teal)/10" : selectedTask ? "border-solid border-(--accent-teal) bg-(--bg-dark)" : "border-dashed border-(--border-color) bg-(--bg-dark)/50"}`}>
                {selectedTask ? (
                    <div className="text-center p-4 z-10 w-full">
                        <h3 className="text-xl font-bold text-(--text-main) truncate w-full px-2">{selectedTask.title}</h3>
                        <button onClick={() => setSelectedId(null)} className="text-xs text-(--text-muted) hover:text-red-400 mt-2 underline transition-colors">Change Chapter</button>
                    </div>
                ) : <span className="text-(--text-muted) text-sm font-medium z-10">Drag a chapter here</span>}
            </div>
        );
    };

    if (!isFocusModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFocusModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-(--bg-sidebar) border border-(--border-color) rounded-2xl md:rounded-3xl w-full max-w-3xl md:h-[600px] max-h-[90vh] overflow-y-auto md:overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 bg-(--bg-card) border-b md:border-b-0 md:border-r border-(--border-color) p-4 md:p-6 flex flex-col md:h-full">
                    <h2 className="text-sm md:text-lg font-bold text-(--text-main) mb-2">Library</h2>
                    <input type="text" placeholder="Search chapters..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-(--bg-dark) border border-(--border-color) rounded-lg px-3 py-2 text-xs md:text-sm text-(--text-main) mb-3 md:mb-4" />
                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

                        <div className="flex-1 md:overflow-y-auto space-y-2 md:space-y-3 custom-scrollbar min-h-0">
                            {activeTasks.map(task => (
                                <div key={task.id} className="bg-(--bg-dark) border border-(--border-color) rounded-lg md:rounded-xl p-3 cursor-grab hover:border-(--accent-teal) transition-colors">
                                    <h4 className="text-(--text-main) font-bold text-xs md:text-sm truncate">{task.title}</h4>
                                    <span className="text-[9px] md:text-[10px] text-(--text-muted) uppercase font-bold">{task.load}</span>
                                </div>
                            ))}
                            {activeTasks.length === 0 && <p className="text-[10px] text-(--text-muted) italic py-4 text-center">No active chapters found.</p>}
                        </div>
                        <div className="mt-4 md:mt-4 pt-4 md:pt-4 border-t border-(--border-color)"><CrucibleDropZone /></div>
                        <DragOverlay>{activeDragId ? <div className="bg-(--bg-dark) border border-(--accent-teal) rounded-lg md:rounded-xl p-3 shadow-2xl opacity-90 scale-105"><h4 className="text-xs md:text-sm">{tasks.find(t => t.id === activeDragId)?.title}</h4></div> : null}</DragOverlay>
                    </DndContext>
                </div>
                <div className="w-full md:w-2/3 p-4 md:p-8 flex flex-col justify-between md:h-full md:overflow-y-auto custom-scrollbar">

                    <div className="flex justify-between items-start mb-6 md:mb-6 gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold">Focus Engine</h2>
                            <p className="text-xs md:text-sm text-(--text-muted)">Configure your session frequency.</p>
                        </div>
                        <SquishyButton onClick={closeFocusModal} className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-2 rounded-full transition-colors">
                            <X size={18} className="md:w-5 md:h-5" />
                        </SquishyButton>
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-6 md:py-0">
                        <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-sm mx-auto w-full">
                            <SquishyButton 
                                onClick={() => useStudyStore.getState().startMode('studyCafe', selectedTask?.id || null)} 
                                className="flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl border border-(--border-color) bg-(--bg-dark) hover:border-(--accent-cyan) hover:bg-(--accent-cyan)/5 transition-all group"
                            >
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-(--bg-card) flex items-center justify-center border border-(--border-color) group-hover:border-(--accent-cyan)/50">
                                    <Coffee size={24} className="md:w-7 md:h-7 text-(--text-muted) group-hover:text-(--accent-cyan)" />
                                </div>
                                <span className="font-bold text-(--text-main) text-xs md:text-base">Cafe</span>
                            </SquishyButton>

                            <SquishyButton 
                                onClick={() => useStudyStore.getState().startMode('flowState', selectedTask?.id || null)} 
                                className="flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl border border-(--accent-teal)/30 bg-(--accent-teal)/10 hover:bg-(--accent-teal)/20 hover:border-(--accent-teal) transition-all group"
                            >
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-(--accent-teal)/20 flex items-center justify-center border border-(--accent-teal)/30 group-hover:border-(--accent-teal)">
                                    <Waves size={24} className="md:w-7 md:h-7 text-(--accent-teal)" />
                                </div>
                                <span className="font-bold text-(--text-main) text-xs md:text-base">Flow</span>
                            </SquishyButton>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-0 p-4 bg-(--bg-dark)/40 rounded-xl border border-(--border-color)/50">
                        <div className="flex items-center gap-3 text-(--text-muted)">
                            <Timer size={14} />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Neural Calibration: {pomodoroFocus}m Focus / {pomodoroShortBreak}m Break</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

            </motion.div>
        </div>
    );
};

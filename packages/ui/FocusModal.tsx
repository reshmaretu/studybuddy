"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Coffee, Waves, Lock, FileSignature, Timer } from "lucide-react";
import { useStudyStore } from "@studybuddy/api";
import { SquishyButton } from "./SquishyButton";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";

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
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-(--bg-sidebar) border border-(--border-color) rounded-2xl md:rounded-3xl w-full max-w-3xl md:h-[600px] max-h-[90vh] overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 bg-(--bg-card) border-r border-(--border-color) p-3 md:p-6 flex flex-col h-full overflow-hidden">
                    <h2 className="text-xs md:text-lg font-bold text-(--text-main) mb-1">Library</h2>
                    <input type="text" placeholder="Search chapters..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-(--bg-dark) border border-(--border-color) rounded-lg px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-(--text-main) mb-2 md:mb-4" />
                    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className="flex-1 overflow-y-auto space-y-1.5 md:space-y-3 custom-scrollbar min-h-0">
                            {activeTasks.map(task => (
                                <div key={task.id} className="bg-(--bg-dark) border border-(--border-color) rounded-lg md:rounded-xl p-2 md:p-3 cursor-grab hover:border-(--accent-teal) transition-colors">
                                    <h4 className="text-(--text-main) font-bold text-[11px] md:text-sm truncate">{task.title}</h4>
                                    <span className="text-[8px] md:text-[10px] text-(--text-muted) uppercase font-bold">{task.load}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-(--border-color)"><CrucibleDropZone /></div>
                        <DragOverlay>{activeDragId ? <div className="bg-(--bg-dark) border border-(--accent-teal) rounded-lg md:rounded-xl p-2 md:p-3 shadow-2xl opacity-90 scale-105"><h4 className="text-xs md:text-sm">{tasks.find(t => t.id === activeDragId)?.title}</h4></div> : null}</DragOverlay>
                    </DndContext>
                </div>
                <div className="w-full md:w-2/3 p-3 md:p-8 flex flex-col justify-between h-full overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-3 md:mb-6 gap-2">
                        <div><h2 className="text-lg md:text-2xl font-bold">Focus</h2><p className="text-[10px] md:text-sm text-(--text-muted)">Configure session.</p></div>
                        <SquishyButton onClick={closeFocusModal} className="text-(--text-muted) hover:text-(--text-main) bg-(--bg-dark) p-1 md:p-2 rounded-full transition-colors"><X size={16} className="md:w-5 md:h-5" /></SquishyButton>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-4 mt-auto">
                        <SquishyButton onClick={() => useStudyStore.getState().startMode('studyCafe', selectedTask?.id || null)} className="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg md:rounded-2xl border border-(--border-color) bg-(--bg-dark) hover:border-(--accent-cyan) hover:bg-(--accent-cyan)/5 transition-all group">
                            <Coffee size={20} className="md:w-7 md:h-7 text-(--text-muted) group-hover:text-(--accent-cyan)" /><span className="font-bold text-(--text-main) text-[10px] md:text-sm">Cafe</span>
                        </SquishyButton>
                        <SquishyButton onClick={() => useStudyStore.getState().startMode('flowState', selectedTask?.id || null)} className="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg md:rounded-2xl border border-(--accent-teal)/30 bg-(--accent-teal)/10 hover:bg-(--accent-teal)/20 hover:border-(--accent-teal) transition-all group">
                            <Waves size={20} className="md:w-7 md:h-7 text-(--accent-teal)" /><span className="font-bold text-(--text-main) text-[10px] md:text-sm">Flow</span>
                        </SquishyButton>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

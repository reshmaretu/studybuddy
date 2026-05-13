"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Coffee, Waves, Lock, FileSignature, Timer, Bell, Sparkles } from "lucide-react";
import { useStudyStore, Task } from "@/store/useStudyStore";
import { useState } from "react";
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { SquishyButton } from "@studybuddy/ui";

export default function FocusModal() {
    const {
        isFocusModalOpen, closeFocusModal, focusTaskId, tasks,
        pomodoroFocus, pomodoroShortBreak, pomodoroLongBreak, pomodoroCycles, updatePomodoroSettings,
        triggerChumToast, setPremiumModalOpen, isPremiumUser, isGhostModeActive, setGhostMode
    } = useStudyStore();

    // Local state for modal toggles
    const [selectedId, setSelectedId] = useState<string | null>(focusTaskId || null);
    const [contractMode, setContractMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPomodoroSettingsOpen, setIsPomodoroSettingsOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Sync state if opened from a specific card
    if (focusTaskId && selectedId !== focusTaskId) setSelectedId(focusTaskId);

    // FIX 1: Filter out the currently selected task so it disappears from the Library
    const activeTasks = tasks.filter(t =>
        !t.isCompleted &&
        t.id !== selectedId &&
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedTask = tasks.find(t => t.id === selectedId && !t.isCompleted);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (event.over && event.over.id === "focus-crucible") {
            setSelectedId(event.active.id as string);
        }
    };

    const OverlayMiniTask = ({ task }: { task: Task }) => (
        <div className="flex items-center gap-3 bg-[var(--bg-sidebar)] p-3 rounded-2xl border border-[var(--border-color)] shadow-xl w-64 opacity-50">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-teal)]" />
            <span className="text-xs font-bold text-[var(--text-main)] truncate">{task.title}</span>
        </div>
    );

    const DraggableMiniTask = ({ task }: { task: Task }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
        return (
            <div
                ref={setNodeRef} {...listeners} {...attributes}
                className={`bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-[var(--accent-teal)] transition-colors ${isDragging ? "opacity-50" : ""}`}
            >
                <h4 className="text-[var(--text-main)] font-bold text-sm truncate">{task.title}</h4>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">{task.load} Load</span>
            </div>
        );
    };

    const CrucibleDropZone = () => {
        const { isOver, setNodeRef } = useDroppable({ id: "focus-crucible" });
        return (
            <div
                ref={setNodeRef}
                className={`h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${isOver ? "border-dashed border-[var(--accent-teal)] bg-[var(--accent-teal)]/10" : selectedTask ? "border-solid border-[var(--accent-teal)] bg-[var(--bg-dark)]" : "border-dashed border-[var(--border-color)] bg-[var(--bg-dark)]/50"}`}
            >
                {selectedTask ? (
                    <div className="text-center p-4 z-10 w-full">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-widest uppercase bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border border-[var(--accent-teal)]/20 mb-2 inline-block">Locked In</span>
                        <h3 className="text-xl font-bold text-[var(--text-main)] line-clamp-1 truncate w-full px-2">{selectedTask.title}</h3>
                        <button onClick={() => setSelectedId(null)} className="text-xs text-[var(--text-muted)] hover:text-red-400 mt-2 transition-colors underline">Change Chapter</button>
                    </div>
                ) : (
                    <span className="text-[var(--text-muted)] text-sm font-medium z-10">Drag a chapter here</span>
                )}
            </div>
        );
    };

    const renderPomodoroSettings = () => {
        if (!isPomodoroSettingsOpen) return null;
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl" onClick={() => setIsPomodoroSettingsOpen(false)} />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 relative z-10 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-[var(--text-main)]">Pomodoro Settings</h3>
                        <button onClick={() => setIsPomodoroSettingsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={18} /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Focus (min)</label>
                            <input type="number" min={15} max={45} value={pomodoroFocus || ''} onChange={e => updatePomodoroSettings({ pomodoroFocus: Number(e.target.value) })} className="w-16 bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none focus:border-[var(--accent-teal)] rounded-md px-2 py-1 text-center text-[var(--text-main)]" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Short Break (min)</label>
                            <input type="number" min={3} max={15} value={pomodoroShortBreak || ''} onChange={e => updatePomodoroSettings({ pomodoroShortBreak: Number(e.target.value) })} className="w-16 bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none focus:border-[var(--accent-teal)] rounded-md px-2 py-1 text-center text-[var(--text-main)]" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Long Break (min)</label>
                            <input type="number" min={15} max={30} value={pomodoroLongBreak || ''} onChange={e => updatePomodoroSettings({ pomodoroLongBreak: Number(e.target.value) })} className="w-16 bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none focus:border-[var(--accent-teal)] rounded-md px-2 py-1 text-center text-[var(--text-main)]" />
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Cycles until Long Break</label>
                            <input type="number" min={2} max={6} value={pomodoroCycles || ''} onChange={e => updatePomodoroSettings({ pomodoroCycles: Number(e.target.value) })} className="w-16 bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none focus:border-[var(--accent-teal)] rounded-md px-2 py-1 text-center text-[var(--text-main)]" />
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-[var(--border-color)]">
                        <p className="text-xs text-[var(--text-muted)] mb-2 font-bold uppercase tracking-widest">Sequence</p>
                        <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-[var(--text-main)] font-medium bg-[var(--bg-dark)]/50 p-2 rounded-lg border border-[var(--border-color)]">
                            {Array.from({ length: pomodoroCycles || 1 }).map((_, i) => (
                                <span key={i} className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[var(--accent-teal)] px-1.5 py-0.5 rounded bg-[var(--accent-teal)]/10 text-center w-6">{pomodoroFocus}</span>
                                    {i < (pomodoroCycles || 1) - 1 && (
                                        <>
                                            <span className="text-[var(--text-muted)] opacity-50">&rarr;</span>
                                            <span className="text-[var(--accent-yellow)] px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/10 text-center w-6">{pomodoroShortBreak}</span>
                                            <span className="text-[var(--text-muted)] opacity-50">&rarr;</span>
                                        </>
                                    )}
                                </span>
                            ))}
                            <span className="text-[var(--text-muted)] opacity-50">&rarr;</span>
                            <span className="text-[var(--accent-cyan)] px-1.5 py-0.5 rounded bg-[var(--accent-cyan)]/10 text-center w-6 mb-1">{pomodoroLongBreak}</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    if (!isFocusModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFocusModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal - FIX 2: Added strict height constraints (md:h-[600px] max-h-[90vh]) */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl w-full max-w-[95vw] md:max-w-3xl h-[90vh] md:h-[600px] overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row"
            >

                {renderPomodoroSettings()}

                {/* LEFT PANEL: Task Selection (DND) */}
                <div className="w-full md:w-1/3 bg-[var(--bg-card)] border-r border-[var(--border-color)] p-4 sm:p-6 flex flex-col h-full min-h-0">
                    <h2 className="text-lg font-bold text-[var(--text-main)] mb-1 flex-shrink-0">Library</h2>
                    <p className="text-xs text-[var(--text-muted)] mb-4 flex-shrink-0">Select your chapter.</p>

                    {/* Search Input */}
                    <div className="relative mb-4 flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Search chapters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-teal)] transition-colors"
                        />
                    </div>

                    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        {/* Scrollable Area - FIX 2: Added min-h-0 so flex-1 scrolls properly */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-0">
                            {activeTasks.map(task => <DraggableMiniTask key={task.id} task={task} />)}
                            {activeTasks.length === 0 && (
                                <p className="text-xs text-[var(--text-muted)] italic text-center mt-4">No chapters found.</p>
                            )}
                        </div>

                        {/* Crucible Zone - Locked to the bottom */}
                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex-shrink-0">
                            <CrucibleDropZone />
                        </div>
                        <DragOverlay>
                            {(() => {
                                const draggedTask = tasks.find(t => t.id === activeDragId);
                                return draggedTask ? <OverlayMiniTask task={draggedTask} /> : null;
                            })()}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* RIGHT PANEL: Settings & Launch */}
                <div className="w-full md:w-2/3 p-5 sm:p-8 flex flex-col justify-between h-full overflow-y-auto custom-scrollbar">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">Focus Parameters</h2>
                                <p className="text-sm text-[var(--text-muted)]">Configure your session.</p>
                            </div>
                            <SquishyButton onClick={closeFocusModal} className="text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-dark)] p-2 rounded-full transition-colors border-none"><X size={20} /></SquishyButton>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-4 mb-8">
                            {/* Pomodoro */}
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)]/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center"><Timer size={20} /></div>
                                    <div>
                                        <h4 className="text-[var(--text-main)] font-bold text-sm">Pomodoro Settings</h4>
                                        <p className="text-xs text-[var(--text-muted)]">{pomodoroFocus} / {pomodoroShortBreak} / {pomodoroLongBreak}</p>
                                    </div>
                                </div>
                                <SquishyButton
                                    onClick={() => setIsPomodoroSettingsOpen(true)}
                                    className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-4 py-1.5 hover:border-[var(--accent-teal)] transition-colors"
                                >
                                    Edit
                                </SquishyButton>
                            </div>

                            {/* Contract Mode */}
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/30 transition-colors cursor-pointer" onClick={() => setContractMode(!contractMode)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${contractMode ? "bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]" : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"}`}><FileSignature size={20} /></div>
                                    <div>
                                        <h4 className="text-[var(--text-main)] font-bold text-sm">Contract Mode</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Auto-locks timer based on task load</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${contractMode ? "bg-[var(--accent-teal)]" : "bg-[var(--border-color)]"}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${contractMode ? "translate-x-6" : ""}`} />
                                </div>
                            </div>

                            {/* Premium Ghost Mode */}
                            <div 
                                className={`flex items-center justify-between p-4 rounded-2xl border border-[var(--accent-yellow)]/20 bg-[var(--accent-yellow)]/5 relative overflow-hidden group transition-all ${isPremiumUser ? 'cursor-pointer hover:border-[var(--accent-yellow)]/40' : 'cursor-help'}`}
                                onClick={() => {
                                    if (isPremiumUser) {
                                        setGhostMode(!isGhostModeActive);
                                    } else {
                                        triggerChumToast(
                                            "Ghost Mode requires a higher neural link. Upgrade to StudyBuddy Pro for full immersion.",
                                            "warning",
                                            () => setPremiumModalOpen(true)
                                        );
                                    }
                                }}
                            >
                                <div className={`flex items-center gap-3 transition-opacity ${!isPremiumUser ? 'opacity-60' : 'opacity-100'}`}>
                                    <div className="w-10 h-10 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] flex items-center justify-center">
                                        {isPremiumUser ? <Sparkles size={18} /> : <Lock size={18} />}
                                    </div>
                                    <div>
                                        <h4 className="text-[var(--accent-yellow)] font-bold text-sm flex items-center gap-2">Ghost Mode <span className="text-[10px] bg-[var(--accent-yellow)] text-black px-1.5 py-0.5 rounded font-black uppercase">Pro</span></h4>
                                        <p className="text-xs text-[var(--text-muted)]">Hides timer for pure immersion</p>
                                    </div>
                                </div>
                                {isPremiumUser ? (
                                    <div className={`w-12 h-6 rounded-full relative transition-colors ${isGhostModeActive ? "bg-[var(--accent-yellow)]" : "bg-[var(--border-color)]"}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isGhostModeActive ? "translate-x-6" : ""}`} />
                                    </div>
                                ) : (
                                    <button 
                                        className="text-xs font-bold text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--accent-yellow)] hover:text-black transition-colors"
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Launch Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                        <SquishyButton
                            disabled={false}
                            onClick={() => {
                                useStudyStore.getState().startMode('studyCafe', selectedTask?.id || null);
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-all group">
                            <Coffee size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors" />
                            <span className="font-bold text-[var(--text-main)]">Study Cafe</span>
                        </SquishyButton>
                        <SquishyButton
                            disabled={false}
                            onClick={() => {
                                useStudyStore.getState().startMode('flowState', selectedTask?.id || null);
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10 hover:bg-[var(--accent-teal)]/20 hover:border-[var(--accent-teal)] transition-all group shadow-[0_0_15px_rgba(20,184,166,0.1)] hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                        >
                            <Waves size={24} className="text-[var(--accent-teal)]" />
                            <span className="font-bold text-[var(--text-main)]">FlowState</span>
                        </SquishyButton>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
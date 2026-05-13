"use client";

import { useState, useEffect, useRef } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Inbox, Sparkles, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { useStudyStore, Task } from "@/store/useStudyStore";
import TaskCard from "@/components/TaskCard";
import { useTerms } from "@/hooks/useTerms";

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

// 1. The draggable card used for the Stash and Horizon view
function MiniTimelineCard({ task, isOverlay = false }: { task: Task; isOverlay?: boolean }) {
    return <TaskCard task={task} isOverlay={isOverlay} isMinimized={true} />;
}

// 2. The compact draggable card used for the Month Grid
function CompactTaskCard({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: task });

    if (isDragging) return <div ref={setNodeRef} className="h-5 rounded bg-[var(--bg-dark)]/30 border border-dashed border-[var(--border-color)] opacity-50 mb-1" />;

    const loadColors = {
        heavy: "bg-red-500/15 text-red-400 border-red-500/30",
        medium: "bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30",
        light: "bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] border-[var(--accent-teal)]/30"
    };

    return (
        <div ref={setNodeRef} {...listeners} {...attributes}
            className={`px-1.5 py-0.5 mb-1 rounded text-[9px] font-bold truncate cursor-grab active:cursor-grabbing border hover:scale-[1.02] transition-transform ${loadColors[task.load]}`}
        >
            {task.title}
        </div>
    );
}

// 3. Drop zone for Horizon View (7-day scrolling)
function DayColumn({ date, tasks }: { date: Date; tasks: Task[] }) {
    const dateString = date.toISOString().split('T')[0];
    const { setNodeRef, isOver } = useDroppable({ id: `date-${dateString}` });
    const isToday = new Date().toISOString().split('T')[0] === dateString;

    return (
        <div ref={setNodeRef} className={`flex flex-col min-h-[400px] rounded-2xl p-3 transition-all duration-300 border ${isOver ? "bg-[var(--accent-teal)]/5 border-[var(--accent-teal)] shadow-[0_0_15px_rgba(20,184,166,0.1)]" : isToday ? "bg-[var(--bg-card)] border-[var(--border-color)] shadow-md" : "bg-[var(--bg-sidebar)] border-transparent"}`}>
            <div className="flex items-center justify-between mb-4 px-1">
                <span className={`text-xs font-bold uppercase tracking-widest ${isToday ? "text-[var(--accent-teal)]" : "text-[var(--text-muted)]"}`}>{isToday ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday ? "bg-[var(--accent-teal)] text-[#0b1211]" : "text-[var(--text-main)] bg-[var(--bg-dark)]"}`}>{date.getDate()}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
                {tasks.map(task => <MiniTimelineCard key={task.id} task={task} />)}
                {tasks.length === 0 && !isOver && <div className="flex-1 flex items-center justify-center opacity-30"><span className="text-2xl">·</span></div>}
            </div>
        </div>
    );
}

// 4. Drop zone for Month Grid (35 squares)
function MonthCell({ date, tasks, isCurrentMonth }: { date: Date; tasks: Task[]; isCurrentMonth: boolean }) {
    const dateString = date.toISOString().split('T')[0];
    const { setNodeRef, isOver } = useDroppable({ id: `date-${dateString}` });
    const isToday = new Date().toISOString().split('T')[0] === dateString;

    return (
        <div ref={setNodeRef} className={`flex-1 min-h-[70px] sm:min-h-0 p-1.5 flex flex-col border border-[var(--border-color)] transition-colors ${!isCurrentMonth ? "bg-[var(--bg-dark)]/40 opacity-50" : "bg-[var(--bg-sidebar)]"} ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]" : ""} ${isToday ? "ring-1 ring-[var(--accent-teal)] shadow-[inset_0_0_15px_rgba(20,184,166,0.1)]" : ""}`}>
            <div className="flex justify-between items-start mb-1 px-1">
                <span className={`text-[10px] font-bold ${isToday ? "text-[var(--accent-teal)] bg-[var(--accent-teal)]/10 px-1.5 py-0.5 rounded-full" : "text-[var(--text-muted)]"}`}>{date.getDate()}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col" style={{ scrollbarWidth: 'thin', msOverflowStyle: 'auto' }}>
                {tasks.map(task => <CompactTaskCard key={task.id} task={task} />)}
            </div>
        </div>
    );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TactileCalendar() {
    const { tasks, updateTask } = useStudyStore();
    const { terms } = useTerms();
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const horizonRef = useRef<HTMLDivElement>(null);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const { isGamified } = useTerms();

    // UI State
    const [view, setView] = useState<'horizon' | 'month'>('month');
    const [baseDate, setBaseDate] = useState(new Date());

    // Filter State (The Lens Bar)
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'heavy' | 'medium' | 'light' | null>(null);

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    // ── THE FILTERING ENGINE ──
    const filteredTasks = tasks.filter(t => {
        if (t.isCompleted) return false;

        // Lens Bar: Search Filter
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Lens Bar: Load Filter
        if (activeFilter && t.load !== activeFilter) {
            return false;
        }

        return true;
    });

    // Horizon Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
    });

    // Month Data Generation
    const getMonthGrid = (base: Date) => {
        const year = base.getFullYear();
        const month = base.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        for (let i = firstDay.getDay() - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
    };
    const monthGrid = getMonthGrid(baseDate);

    // Data Routing (Using our highly filtered list!)
    const stashedTasks = filteredTasks.filter(t => !t.deadline || isNaN(new Date(t.deadline as string).getTime()));

    const scheduledTasksMap = filteredTasks.reduce((acc, task) => {
        if (task.deadline) {
            const dateObj = new Date(task.deadline as string);
            if (!isNaN(dateObj.getTime())) {
                const dateStr = dateObj.toISOString().split('T')[0];
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(task);
            }
        }
        return acc;
    }, {} as Record<string, Task[]>);

    // Drag Actions
    const handleDragStart = (event: DragStartEvent) => setActiveDragTask(filteredTasks.find(t => t.id === event.active.id) || null);

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;
        if (!over) return;

        if (over.id === "stash") {
            updateTask(active.id as string, { deadline: undefined });
            return;
        }

        if (typeof over.id === 'string' && over.id.startsWith("date-")) {
            const dateString = over.id.replace("date-", "");
            const newDate = new Date(dateString);
            newDate.setHours(12, 0, 0, 0); // Prevent timezone shifting bugs
            updateTask(active.id as string, { deadline: newDate.toISOString() });
        }
    };

    // 🎢 Horizon Mouse Wheel & Swipe Logic
    const handleHorizonWheel = (e: React.WheelEvent) => {
        if (view !== 'horizon') return;
        if (horizonRef.current) {
            horizonRef.current.scrollLeft += e.deltaY;
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (view !== 'horizon' || !horizonRef.current) return;
        setIsSwiping(true);
        setStartX(e.pageX - horizonRef.current.offsetLeft);
        setScrollLeft(horizonRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSwiping || view !== 'horizon' || !horizonRef.current) return;
        e.preventDefault();
        const x = e.pageX - horizonRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        horizonRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => setIsSwiping(false);

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={`h-screen flex flex-col space-y-4 p-6 md:p-8 overflow-hidden ${isSwiping ? 'cursor-grabbing' : ''}`}>

                {/* HEADER */}
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                            <CalendarIcon className="text-[var(--accent-teal)]" size={26} />
                            {terms.questForecast}
                        </h1>
                        <p className="text-[var(--text-muted)] mt-1">
                            {isGamified ? "Plant quests from your Seed Bank to chart your journey." : "Plant quests from your Stash to chart your journey"}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div id="calendar-view-toggle" className="flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl shadow-sm shrink-0 scale-90 sm:scale-100">
                        <button onClick={() => setView('horizon')} className={`px-2 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${view === 'horizon' ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
                            {terms.questForecast}
                        </button>
                        <button onClick={() => setView('month')} className={`px-2 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${view === 'month' ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
                            Month
                        </button>
                    </div>
                </header>

                {/* 💎 THE LENS BAR (Search & Filtering) */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[var(--bg-card)] border border-[var(--border-color)] p-2 rounded-2xl shadow-sm z-10">

                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder=" Search your quests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-[var(--accent-teal)] transition-colors placeholder:text-[var(--text-muted)]/70"
                        />
                    </div>

                    {/* Load Filters */}
                    <div className="flex items-center gap-2 pr-2 flex-wrap">
                        <Filter size={16} className="text-[var(--text-muted)] mr-2" />
                        {(['heavy', 'medium', 'light'] as const).map(load => {
                            const isActive = activeFilter === load;

                            // Determine dynamic colors for the active pills
                            let colorClass = 'bg-[var(--bg-dark)] text-[var(--text-muted)] border-transparent hover:border-[var(--border-color)]';
                            if (isActive) {
                                if (load === 'heavy') colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
                                if (load === 'medium') colorClass = 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30';
                                if (load === 'light') colorClass = 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] border-[var(--accent-teal)]/30';
                            }

                            return (
                                <button
                                    key={load}
                                    onClick={() => setActiveFilter(isActive ? null : load)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${colorClass}`}
                                >
                                    {load === 'heavy' ? terms.heavyLoad : load === 'medium' ? terms.mediumLoad : terms.lightLoad}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pt-2 lg:overflow-hidden pb-4">

                    {/* LEFT: THE STASH */}
                    <div id="calendar-seed-bank" className="w-full lg:w-80 h-[400px] lg:h-full flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 overflow-hidden shadow-sm relative shrink-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Inbox size={18} className="text-[var(--accent-yellow)]" />
                            <h2 className="font-bold text-[var(--text-main)]">{terms.stash}</h2>
                            <span className="ml-auto bg-[var(--bg-dark)] px-2 py-0.5 rounded-md text-xs font-bold text-[var(--text-muted)]">
                                {stashedTasks.length}
                            </span>
                        </div>

                        <div className="absolute inset-0 z-0"><DroppableStash /></div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 space-y-1">
                            <AnimatePresence>
                                {stashedTasks.map(task => (
                                    <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                                        <MiniTimelineCard task={task} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {stashedTasks.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 text-center p-4">
                                    <Sparkles size={32} className="mb-2" />
                                    <p className="text-sm font-medium">No chapters match your query.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: THE TIMELINES */}
                    <div id="calendar-temporal-nexus" className="flex-1 lg:h-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 flex flex-col overflow-hidden shadow-sm">

                        {/* ── Horizon View ── */}
                        {view === 'horizon' && (
                            <div
                                id="calendar-nexus-anchor"
                                ref={horizonRef}
                                onWheel={handleHorizonWheel}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                className="flex-1 overflow-x-auto pb-6 no-scrollbar relative select-none"
                            >
                                <div className="flex gap-4 min-w-max h-full">
                                    {next7Days.map((date) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        return <div key={dateStr} className="w-64"><DayColumn date={date} tasks={scheduledTasksMap[dateStr] || []} /></div>;
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Month Grid View ── */}
                        {view === 'month' && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Month Controls */}
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-[var(--text-main)]">
                                        {baseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))} className="p-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors"><ChevronLeft size={18} /></button>
                                        <button onClick={() => setBaseDate(new Date())} className="px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold hover:border-[var(--accent-teal)] transition-colors">Today</button>
                                        <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))} className="p-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors"><ChevronRight size={18} /></button>
                                    </div>
                                </div>

                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-center text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">{day}</div>
                                    ))}
                                </div>

                                {/* The 35/42 Cell Grid */}
                                <div className="flex-1 grid grid-cols-7 grid-rows-6 rounded-xl overflow-hidden border border-[var(--border-color)] min-h-0">
                                    {monthGrid.map(({ date, isCurrentMonth }) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        return <MonthCell key={dateStr} date={date} isCurrentMonth={isCurrentMonth} tasks={scheduledTasksMap[dateStr] || []} />;
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <MiniTimelineCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
}

// Stash Droppable overlay
function DroppableStash() {
    const { setNodeRef, isOver } = useDroppable({ id: "stash" });
    return <div ref={setNodeRef} className={`w-full h-full rounded-3xl transition-colors duration-300 ${isOver ? "bg-[var(--accent-yellow)]/10 border-2 border-dashed border-[var(--accent-yellow)]" : "border-2 border-transparent"}`} />;
}
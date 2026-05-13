"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyStore, Task } from "@/store/useStudyStore";
import TaskCard from "@/components/TaskCard";
import { useTerms } from "@/hooks/useTerms";
import { LayoutGrid, Calendar as CalendarIcon, Inbox, Sparkles, ChevronLeft, ChevronRight, Search, Filter, Clock } from "lucide-react";

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

// Robust local date string generator (YYYY-MM-DD)
function toLocalDateString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function MiniTimelineCard({ task, isOverlay = false }: { task: Task; isOverlay?: boolean }) {
    return <TaskCard task={task} isOverlay={isOverlay} isMinimized={true} />;
}

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

function DayColumn({ date, tasks }: { date: Date; tasks: Task[] }) {
    const dateString = toLocalDateString(date);
    const { setNodeRef, isOver } = useDroppable({ id: `date-${dateString}` });
    const isToday = toLocalDateString(new Date()) === dateString;

    return (
        <div ref={setNodeRef} className={`flex flex-col h-full rounded-2xl pt-3 px-3 pb-1 transition-all duration-300 border ${isOver ? "bg-[var(--accent-teal)]/5 border-[var(--accent-teal)] shadow-[0_0_15px_rgba(20,184,166,0.1)]" : isToday ? "bg-[var(--bg-card)] border-[var(--border-color)] shadow-md" : "bg-[var(--bg-sidebar)] border-transparent"}`}>
            <div className="flex items-center justify-between mb-4 px-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isToday ? "text-[var(--accent-teal)]" : "text-[var(--text-muted)]"}`}>{isToday ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isToday ? "bg-[var(--accent-teal)] text-[#0b1211]" : "text-[var(--text-main)] bg-[var(--bg-dark)]"}`}>{date.getDate()}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
                {tasks.map(task => <MiniTimelineCard key={task.id} task={task} />)}
                {tasks.length === 0 && !isOver && <div className="flex-1 flex items-center justify-center opacity-10"><Clock size={24} /></div>}
            </div>
        </div>
    );
}

function MonthCell({ date, tasks, isCurrentMonth }: { date: Date; tasks: Task[]; isCurrentMonth: boolean }) {
    const dateString = toLocalDateString(date);
    const { setNodeRef, isOver } = useDroppable({ id: `date-${dateString}` });
    const isToday = toLocalDateString(new Date()) === dateString;

    return (
        <div ref={setNodeRef} className={`flex-1 min-h-[80px] p-1.5 flex flex-col border border-[var(--border-color)]/30 transition-colors ${!isCurrentMonth ? "bg-[var(--bg-dark)]/40 opacity-30" : "bg-[var(--bg-sidebar)]/30"} ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]" : ""} ${isToday ? "ring-1 ring-[var(--accent-teal)] shadow-[inset_0_0_15px_rgba(20,184,166,0.1)]" : ""}`}>
            <div className="flex justify-between items-start mb-1 px-1">
                <span className={`text-[9px] font-bold ${isToday ? "text-[var(--accent-teal)] bg-[var(--accent-teal)]/10 px-1.5 py-0.5 rounded-full" : "text-[var(--text-muted)]"}`}>{date.getDate()}</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
                {tasks.map(task => <CompactTaskCard key={task.id} task={task} />)}
            </div>
        </div>
    );
}

// ─── EXPORTED SECTION ────────────────────────────────────────────────────────

export default function CalendarSection() {
    const { tasks } = useStudyStore();
    const { terms, isGamified } = useTerms();

    // UI State
    const [view, setView] = useState<'horizon' | 'month'>('horizon');
    const [baseDate, setBaseDate] = useState(new Date());
    const horizonRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'heavy' | 'medium' | 'light' | null>(null);

    const filteredTasks = useMemo(() => tasks.filter(t => {
        if (t.isCompleted) return false;
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeFilter && t.load !== activeFilter) return false;
        return true;
    }), [tasks, searchQuery, activeFilter]);

    // Data Routings
    const stashedTasks = filteredTasks.filter(t => !t.deadline || isNaN(new Date(t.deadline as string).getTime()));

    const scheduledTasksMap = useMemo(() => filteredTasks.reduce((acc, task) => {
        if (task.deadline) {
            const dateObj = new Date(task.deadline as string);
            if (!isNaN(dateObj.getTime())) {
                const dateStr = toLocalDateString(dateObj);
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(task);
            }
        }
        return acc;
    }, {} as Record<string, Task[]>), [filteredTasks]);

    // Horizon Gen
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
    });

    // Month Gen
    const monthGrid = useMemo(() => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
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
    }, [baseDate]);

    const { setNodeRef: setStashRef, isOver: isStashOver } = useDroppable({ id: "stash" });

    // 🎢 KINETIC SCROLL & DRAG Logic
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (view !== 'horizon' || !horizonRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - horizonRef.current.offsetLeft);
        setScrollLeftState(horizonRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || view !== 'horizon' || !horizonRef.current) return;
        e.preventDefault();
        const x = e.pageX - horizonRef.current.offsetLeft;
        const walk = (x - startX) * 2.5; // Increased scroll speed
        horizonRef.current.scrollLeft = scrollLeftState - walk;
    };

    useEffect(() => {
        const horizon = horizonRef.current;
        if (!horizon) return;

        const handleWheel = (e: WheelEvent) => {
            if (view !== 'horizon') return;
            
            // Strictly intercept only if there is a clear vertical intent on the horizontal element
            // If the user is scrolling slightly vertically, we convert it.
            // If they are on the very edge or outside, we let it bubble.
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                // If we reach the end of the scroll, we could let it bubble, 
                // but usually users prefer a hard lock for focused zones.
                e.preventDefault();
                horizon.scrollLeft += e.deltaY;
            }
        };

        horizon.addEventListener('wheel', handleWheel, { passive: false });
        return () => horizon.removeEventListener('wheel', handleWheel);
    }, [view]);

    return (
        <section className="w-full mt-12 mb-32 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            {/* SECTION HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pr-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-teal)]/10 flex items-center justify-center border border-[var(--accent-teal)]/20 shadow-inner">
                            <CalendarIcon className="text-[var(--accent-teal)]" size={20} />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                            {isGamified ? "Temporal Observatory" : "Task Forecast"}
                        </h2>
                    </div>
                </div>

                {/* Lens Bar Integrated */}
                <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)]/30 backdrop-blur-2xl border border-[var(--border-color)]/50 p-1.5 rounded-2xl shadow-2xl w-full lg:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                        <input
                            type="text"
                            placeholder="Filter timeline..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)]/40 border border-[var(--border-color)]/30 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-[var(--accent-teal)] transition-all"
                        />
                    </div>
                    
                    <div className="flex bg-[var(--bg-dark)]/40 p-1 rounded-xl border border-[var(--border-color)]/20">
                        <button onClick={() => setView('horizon')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'horizon' ? 'bg-[var(--accent-teal)] text-black shadow-lg scale-105' : 'text-[var(--text-muted)] hover:text-white'}`}>Timeline</button>
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'month' ? 'bg-[var(--accent-teal)] text-black shadow-lg scale-105' : 'text-[var(--text-muted)] hover:text-white'}`}>Grid</button>
                    </div>
                </div>
            </div>

            <div className={`flex flex-col lg:flex-row gap-6 h-[600px] ${isDragging ? 'cursor-grabbing' : ''}`}>
                {/* SEED BANK (Stash) */}
                <div className="w-full lg:w-72 h-full flex flex-col bg-[var(--bg-card)]/30 backdrop-blur-md border border-[var(--border-color)]/50 rounded-[32px] p-6 overflow-hidden shadow-2xl relative">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-2">
                            <Inbox size={16} className="text-[var(--accent-yellow)]" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-white">Seed Bank</h3>
                        </div>
                        <span className="bg-white/5 px-2 py-0.5 rounded-md text-[9px] font-black text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20">
                            {stashedTasks.length}
                        </span>
                    </div>

                    <div ref={setStashRef} className={`absolute inset-0 z-0 transition-colors duration-300 ${isStashOver ? "bg-[var(--accent-yellow)]/10 border-2 border-dashed border-[var(--accent-yellow)]/40" : ""}`} />

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 z-10 relative">
                        <AnimatePresence>
                            {stashedTasks.map(task => (
                                <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                                    <MiniTimelineCard task={task} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* THE OBSERVATORY (Timeline/Grid) */}
                <div className="flex-1 h-full bg-[var(--bg-card)]/30 backdrop-blur-md border border-[var(--border-color)]/50 rounded-[32px] pt-6 px-6 pb-2 flex flex-col overflow-hidden shadow-2xl">
                    
                    {view === 'horizon' && (
                        <div 
                            ref={horizonRef} 
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            className="flex-1 overflow-x-auto no-scrollbar flex gap-5 pb-2 select-none cursor-grab"
                        >
                            {next7Days.map((date) => {
                                const dateStr = toLocalDateString(date);
                                return (
                                    <div key={dateStr} className="w-64 shrink-0 h-full">
                                        <DayColumn date={date} tasks={scheduledTasksMap[dateStr] || []} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {view === 'month' && (
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                    {baseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))} className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-all"><ChevronLeft size={16} /></button>
                                    <button onClick={() => setBaseDate(new Date())} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:border-[var(--accent-teal)] transition-all">Today</button>
                                    <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))} className="p-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-white transition-all"><ChevronRight size={16} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 mb-3">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-[9px] font-black tracking-[0.3em] uppercase text-[var(--text-muted)]/60">{day}</div>
                                ))}
                            </div>

                            <div className="flex-1 grid grid-cols-7 grid-rows-6 rounded-2xl overflow-hidden border border-white/10">
                                {monthGrid.map(({ date, isCurrentMonth }) => {
                                    const dateStr = toLocalDateString(date);
                                    return <MonthCell key={dateStr} date={date} isCurrentMonth={isCurrentMonth} tasks={scheduledTasksMap[dateStr] || []} />;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

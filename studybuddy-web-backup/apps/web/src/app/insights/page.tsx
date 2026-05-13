"use client"

import { useState, useEffect, useMemo } from "react";
import { BarChart3, Clock, CheckCircle2, Lock, BrainCircuit, Sparkles, Filter, TrendingUp } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from 'recharts';
import { useStudyStore } from "@/store/useStudyStore";
import { useTerms } from "@/hooks/useTerms";

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        payload?: any;
    }>;
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
        return (
            <div className="bg-[var(--bg-dark)]/90 backdrop-blur-md border border-[var(--border-color)] p-3 rounded-xl shadow-xl z-50">
                <p className="text-[var(--text-main)] font-bold text-sm mb-2">{label || payload[0]?.payload?.name}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-xs font-bold" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function InsightsPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

    // 🔥 FIX 2: Added strict default fallbacks to prevent "undefined" crashes during hydration
    const {
        tasks = [],
        focusScore = 100,
        isPremiumUser = false,
        level = 1,
        flowBreaks = 0,
        tabSwitches = 0,
        dailyFocusScores = {},
        totalSecondsTracked = 0
    } = useStudyStore();
    const { terms } = useTerms();

    useEffect(() => setIsMounted(true), []);

    // ==========================================
    // 📊 RELIABLE, CHRONOLOGICAL DATA ENGINE
    // ==========================================

    const filteredTasks = useMemo(() => {
        const now = new Date();
        const completed = tasks.filter(t => t?.isCompleted);

        return completed.filter(task => {
            if (timeRange === 'all') return true;

            // Safe date parsing fallback
            const completedDate = (task.completedAt && !isNaN(new Date(task.completedAt as string).getTime()))
                ? new Date(task.completedAt as string)
                : now;

            const diffTime = Math.abs(now.getTime() - completedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (timeRange === 'today') return diffDays <= 1 && completedDate.getDate() === now.getDate();
            if (timeRange === 'week') return diffDays <= 7;
            if (timeRange === 'month') return diffDays <= 30;
            return true;
        });
    }, [tasks, timeRange]);

    const heavyCount = filteredTasks.filter(t => t.load === 'heavy').length;
    const mediumCount = filteredTasks.filter(t => t.load === 'medium').length;
    const lightCount = filteredTasks.filter(t => t.load === 'light').length;

    const actualTotalHours = useMemo(() => {
        // If 'all' or if totalSecondsTracked is significant, use the absolute store value
        if (timeRange === 'all' || totalSecondsTracked > 0) {
            return (totalSecondsTracked / 3600).toFixed(1);
        }
        
        // Fallback for new accounts without deep tracking history
        const totalPomos = filteredTasks.reduce((sum, task) => {
            const pomos = task.actualPomos ?? task.estimatedPomos ?? (task.load === 'heavy' ? 4 : task.load === 'medium' ? 2 : 1);
            return sum + pomos;
        }, 0);
        return (totalPomos * 25 / 60).toFixed(1);
    }, [filteredTasks, timeRange, totalSecondsTracked]);

    const displayCompleted = filteredTasks.length;

    const loadDistribution = useMemo(() => {
        if (displayCompleted === 0) return [{ name: 'No Data', value: 1, color: '#334155' }];
        return [
            { name: 'Heavy', value: heavyCount, color: '#f87171' },
            { name: 'Medium', value: mediumCount, color: '#fbbf24' },
            { name: 'Light', value: lightCount, color: '#4ade80' },
        ].filter(d => d.value > 0);
    }, [heavyCount, mediumCount, lightCount, displayCompleted]);

    const hourlyData = useMemo(() => {
        const blocks = [0, 0, 0, 0, 0, 0];
        filteredTasks.forEach(task => {
            const hour = (task.completedAt && !isNaN(new Date(task.completedAt as string).getTime()))
                ? new Date(task.completedAt as string).getHours()
                : new Date().getHours();

            if (hour < 10) blocks[0]++;
            else if (hour < 12) blocks[1]++;
            else if (hour < 14) blocks[2]++;
            else if (hour < 16) blocks[3]++;
            else if (hour < 18) blocks[4]++;
            else blocks[5]++;
        });

        const max = Math.max(...blocks, 1);
        return [
            { name: '8 AM', focus: (blocks[0] / max) * 100 },
            { name: '10 AM', focus: (blocks[1] / max) * 100 },
            { name: '12 PM', focus: (blocks[2] / max) * 100 },
            { name: '2 PM', focus: (blocks[3] / max) * 100 },
            { name: '4 PM', focus: (blocks[4] / max) * 100 },
            { name: '6 PM+', focus: (blocks[5] / max) * 100 },
        ];
    }, [filteredTasks]);

    const weeklyData = useMemo(() => {
        const days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateString = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dateKey = d.toISOString().split('T')[0];

            let dayExpectedPomos = 0;
            let dayActualPomos = 0;
            let dayTaskCount = 0;
            let dayHeavy = 0;

            tasks.filter(t => t?.isCompleted).forEach(task => {
                const cDate = (task.completedAt && !isNaN(new Date(task.completedAt as string).getTime()))
                    ? new Date(task.completedAt as string)
                    : now;

                if (cDate.toDateString() === d.toDateString()) {
                    dayTaskCount++;
                    if (task.load === 'heavy') dayHeavy++;
                    dayExpectedPomos += task.estimatedPomos ?? (task.load === 'heavy' ? 4 : task.load === 'medium' ? 2 : 1);
                    dayActualPomos += task.actualPomos ?? task.estimatedPomos ?? (task.load === 'heavy' ? 4 : task.load === 'medium' ? 2 : 1);
                }
            });

            // 🔥 FIX 3: Safely check dailyFocusScores object
            const historicalScore = dailyFocusScores[dateKey] ?? Math.min(100, 40 + (dayTaskCount * 10) + (dayHeavy * 5));

            days.push({
                name: dateString,
                score: historicalScore,
                expected: dayExpectedPomos,
                actual: dayActualPomos
            });
        }
        return days;
    }, [tasks, dailyFocusScores]);

    const averageFocusScore = useMemo(() => {
        if (weeklyData.length === 0) return focusScore;
        const total = weeklyData.reduce((sum, day) => sum + day.score, 0);
        return Math.round(total / weeklyData.length);
    }, [weeklyData, focusScore]);

    // ==========================================
    // 💎 REAL PREMIUM ANALYTICS DATA
    // ==========================================

    const burnoutMatrixData = useMemo(() => {
        return filteredTasks.map(task => {
            const fallbackStress = task.load === 'heavy' ? 85 : task.load === 'medium' ? 50 : 20;
            const fallbackPomos = task.load === 'heavy' ? 4 : task.load === 'medium' ? 2 : 1;

            const stress = task.stressLevel ?? fallbackStress;
            const pomos = task.actualPomos ?? fallbackPomos;
            const hours = Number((pomos * 25 / 60).toFixed(2));

            return { name: task.title, stress, hours, z: 150 };
        });
    }, [filteredTasks]);

    const estimationStats = useMemo(() => {
        let totalEst = 0;
        let totalAct = 0;
        let overCount = 0;
        let underCount = 0;
        let validTasks = 0;

        filteredTasks.forEach(task => {
            validTasks++;
            const est = task.estimatedPomos ?? (task.load === 'heavy' ? 4 : task.load === 'medium' ? 2 : 1);
            const act = task.actualPomos ?? task.estimatedPomos ?? est;

            totalEst += est;
            totalAct += act;

            if (est > act) overCount++;
            if (est < act) underCount++;
        });

        const overPercent = validTasks > 0 ? Math.round((overCount / validTasks) * 100) : 0;
        const underPercent = validTasks > 0 ? Math.round((underCount / validTasks) * 100) : 0;

        let accuracyScore = 100;
        if (totalEst > 0) {
            const diffPercent = (Math.abs(totalEst - totalAct) / totalEst) * 100;
            accuracyScore = Math.max(0, Math.round(100 - diffPercent));
        } else if (validTasks === 0) {
            accuracyScore = 0;
        }

        return { overPercent, underPercent, accuracyScore, validTasks };
    }, [filteredTasks]);

    const flowIntegrityScore = Math.max(0, 100 - (flowBreaks * 2) - (tabSwitches * 5));
    const breakImpact = flowBreaks * 2;
    const switchImpact = tabSwitches * 5;

    const chumInsight = useMemo(() => {
        if (displayCompleted === 0) return "Your board is clear! Plant some quests to start generating brainwave data.";
        const heavyRatio = heavyCount / displayCompleted;
        if (heavyRatio >= 0.6) return `CRITICAL ALERT: You are carrying a massive cognitive load! ${heavyCount} of your ${displayCompleted} quests were Heavy. You are deep in the Burnout Zone. Schedule a light day tomorrow!`;
        if (focusScore > 85) return `Your flow momentum is peaking! You've beautifully balanced your load over ${displayCompleted} quests. Keep this rhythm.`;
        return `Steady progress! You've conquered ${displayCompleted} quests. Try tackling a Heavy quest early to bump your Focus Score into the flow zone.`;
    }, [displayCompleted, heavyCount, focusScore]);

    if (!isMounted) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16 px-4 min-h-screen">

            {/* HEADER */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                        <BarChart3 className="text-[var(--accent-teal)]" size={28} /> {terms.insights}
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Measuring the growth of your spirit and productivity.</p>
                </div>

                <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl shadow-sm">
                    <div className="px-2 text-[var(--text-muted)]"><Filter size={14} /></div>
                    {(['today', 'week', 'month', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold capitalize transition-colors ${timeRange === range ? 'bg-[var(--bg-dark)] text-[var(--text-main)] border border-[var(--border-color)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </header>

            {/* CHUM AI DATA ANALYSIS */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-5 items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10 shadow-[0_0_15px_rgba(20,184,166,0.2)] shrink-0">
                    <BrainCircuit size={20} className="text-[var(--accent-teal)]" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">Chum's Data Analysis</h3>
                    <p className="text-[var(--text-muted)] text-xs leading-relaxed flex items-center gap-2">
                        {chumInsight}
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-teal)] animate-pulse inline-block" />
                    </p>
                </div>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1">Total Hours Focused</p>
                    <p className="text-3xl font-bold text-[var(--accent-teal)]">{actualTotalHours}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1">{terms.completed}</p>
                    <p className="text-3xl font-bold text-green-400">{displayCompleted}</p>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1">Average {terms.focusScore}</p>
                    <p className="text-3xl font-bold text-[var(--accent-yellow)]">{averageFocusScore}</p>
                </div>
            </div>

            {/* PIE CHART & BAR CHART ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Solid Pie Chart */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm lg:col-span-1 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-[var(--text-main)] self-start w-full mb-4">Quest Load Distribution</h3>
                    <div className="flex-1 w-full relative min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={loadDistribution} innerRadius={0} outerRadius={80} dataKey="value" stroke="none">
                                    {loadDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="bg-[var(--bg-card)] px-3 py-1 rounded-full text-sm font-black shadow-md border border-[var(--border-color)]">100%</span>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f87171]" /> Heavy</span>
                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" /> Medium</span>
                        <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" /> Light</span>
                    </div>
                </div>

                {/* Hourly Bar Chart */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm lg:col-span-2 flex flex-col">
                    <h3 className="text-sm font-bold text-[var(--text-main)] mb-1 flex items-center gap-2">
                        <Clock size={16} className="text-[var(--accent-yellow)]" /> Peak Productivity Volume
                    </h3>
                    <div className="flex-1 w-full min-h-[200px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.2 }} />
                                <Bar dataKey="focus" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} opacity={0.3} stroke="var(--accent-cyan)" strokeWidth={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-center text-[10px] text-[var(--text-muted)] mt-4">When are you completing the most quests?</p>
                </div>
            </div>

            {/* FULL WIDTH LINE CHART */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm h-[300px] flex flex-col">
                <h3 className="text-sm font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--accent-teal)]" /> {terms.focusScore} History (Last 7 Days)
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-teal)" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="var(--accent-teal)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Line type="monotone" dataKey="score" stroke="var(--accent-teal)" strokeWidth={2} dot={{ r: 4, fill: "var(--accent-yellow)", strokeWidth: 1, stroke: "black" }} activeDot={{ r: 6 }} fill="url(#colorScore)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ========================================== */}
            {/* PREMIUM ANALYTICS SECTION */}
            {/* ========================================== */}
            <div className="relative mt-12 pt-4">

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--accent-yellow)]/10 rounded-xl text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-main)]">Premium Analytics</h2>
                            <p className="text-xs text-[var(--text-muted)]">Deep dive into your cognitive performance</p>
                        </div>
                    </div>
                    {isPremiumUser && (
                        <div className="bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/30 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest text-[var(--accent-teal)] uppercase flex items-center gap-2">
                            <CheckCircle2 size={12} /> StudyBuddy+ Active
                        </div>
                    )}
                </div>

                {/* THE BLUR OVERLAY FOR FREE USERS */}
                {!isPremiumUser && (
                    <div className="absolute top-[80px] left-0 w-full h-[calc(100%-80px)] z-50 flex items-center justify-center backdrop-blur-md bg-[var(--bg-dark)]/40 rounded-3xl border border-[var(--border-color)]">
                        <div className="bg-[var(--bg-card)] border border-[var(--accent-yellow)]/30 p-10 rounded-2xl shadow-2xl text-center max-w-md transform hover:scale-105 transition-transform duration-300">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border-2 border-[var(--accent-yellow)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                                <Lock size={28} />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Unlock Premium Analytics</h3>
                            <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
                                Gain access to the Burnout Matrix, Flow Integrity Score, AI Study Archetype analysis, and Task Estimation Accuracy reports.
                            </p>
                            <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-[0_5px_20px_rgba(250,204,21,0.4)] hover:brightness-110 flex items-center justify-center gap-2 mx-auto w-full">
                                <Sparkles size={16} /> Upgrade to Plus
                            </button>
                        </div>
                    </div>
                )}

            {/* PREMIUM CONTENT */}
            <div className={`transition-all duration-500 ${!isPremiumUser ? 'opacity-30 pointer-events-none blur-[4px] select-none' : ''}`}>

                {/* TOP PREMIUM ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                    {/* Burnout Matrix */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm h-[320px] flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                <BrainCircuit size={16} className="text-[#f87171]" /> Burnout Matrix
                            </h3>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#f87171] bg-[#f87171]/10 px-2 py-1 rounded-md border border-[#f87171]/20">Warning: High Load</span>
                        </div>

                        <div className="flex-1 relative border-l border-b border-[var(--border-color)] bg-gradient-to-tr from-[var(--bg-dark)] to-[#f87171]/10">
                            {/* Axis Labels */}
                            <span className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Stress</span>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Time Est (h)</span>

                            {/* Quadrant Labels */}
                            <span className="absolute top-2 left-2 text-[9px] text-[var(--text-muted)]">Anxiety Zone</span>
                            <span className="absolute top-2 right-2 text-[9px] text-[#f87171] font-bold">Burnout Zone</span>
                            <span className="absolute bottom-2 left-2 text-[9px] text-[var(--accent-teal)] font-bold">Flow Zone</span>
                            <span className="absolute bottom-2 right-2 text-[9px] text-[var(--text-muted)]">Boredom Zone</span>

                            {/* Crosshairs */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-[var(--border-color)]" />
                            <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-[var(--border-color)]" />

                            {/* Recharts Scatter */}
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <XAxis type="number" dataKey="hours" hide domain={[0, 10]} />
                                    <YAxis type="number" dataKey="stress" hide domain={[0, 100]} />
                                    <ZAxis type="number" dataKey="z" range={[100, 300]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                    <Scatter data={burnoutMatrixData} fill="#f87171" opacity={0.6} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-[10px] text-[var(--text-muted)] mt-8">Suggestion: Reduce Quest Load by 15% to re-enter Flow Zone.</p>
                    </div>

                    {/* Flow Score Component */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm flex items-center justify-center gap-8">
                        <div className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.1)]" style={{ background: `conic-gradient(var(--accent-teal) ${flowIntegrityScore}%, var(--bg-dark) 0)` }}>
                            <div className="absolute inset-1 rounded-full bg-[var(--bg-card)] flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-[var(--text-main)]">{flowIntegrityScore}%</span>
                                <span className="text-[10px] font-black text-[var(--accent-teal)] uppercase tracking-widest mt-1">Integrity</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-[var(--accent-teal)]" /> Flow Score
                            </h3>
                            <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] border-l-4 border-l-[#f87171] p-3 rounded-lg">
                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                    <span className="text-[var(--text-muted)]">Focus Breaks</span>
                                    <span className="text-[#f87171]">-{breakImpact}% Impact</span>
                                </div>
                                <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-2"><div className="h-full bg-[#f87171]" style={{ width: `${Math.min(100, breakImpact)}%` }} /></div>
                                <p className="text-[9px] text-[var(--text-muted)]">{flowBreaks} interruptions detected.</p>
                            </div>
                            <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] border-l-4 border-l-[#fbbf24] p-3 rounded-lg">
                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                    <span className="text-[var(--text-muted)]">Tab Switches</span>
                                    <span className="text-[#fbbf24]">-{switchImpact}% Impact</span>
                                </div>
                                <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-2"><div className="h-full bg-[#fbbf24]" style={{ width: `${Math.min(100, switchImpact)}%` }} /></div>
                                <p className="text-[9px] text-[var(--text-muted)]">{tabSwitches} tab switches detected.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM PREMIUM ROW: Estimation Accuracy swallowed Archetype space */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">

                    {/* Estimation Accuracy */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm lg:col-span-3 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <BarChart3 size={16} className="text-[var(--accent-teal)]" /> Estimation Accuracy
                                </h3>
                                <div className="flex gap-4 text-[10px] font-bold text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#475569] rounded-sm" /> Estimated Pomodoros</span>
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--accent-teal)] rounded-sm" /> Actual Pomodoros</span>
                                </div>
                            </div>

                            <div className="flex-1 w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.1 }} />
                                        <Bar dataKey="expected" name="Estimated Pomodoros" fill="#475569" radius={[4, 4, 0, 0]} barSize={16} />
                                        <Bar dataKey="actual" name="Actual Pomodoros" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] p-3 rounded-xl text-center">
                                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Overestimation</p>
                                    <p className="text-lg font-bold text-[var(--accent-teal)]">{estimationStats.overPercent}%</p>
                                </div>
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] p-3 rounded-xl text-center">
                                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Underestimation</p>
                                    <p className="text-lg font-bold text-[var(--accent-yellow)]">{estimationStats.underPercent}%</p>
                                </div>
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] p-3 rounded-xl text-center">
                                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] mb-1">Accuracy Score</p>
                                    <p className="text-lg font-bold text-[var(--text-main)]">{estimationStats.accuracyScore}/100</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
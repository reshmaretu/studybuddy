"use client";

import { useEffect, useRef } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { usePathname } from "next/navigation";

export default function ContextualBrain() {
    const { 
        triggerChumToast, isRunning, activeMode, focusScore, tasks, 
        sendLocalNotification, lastPlannedDate, setLastPlannedDate 
    } = useStudyStore();
    
    const lastActivityRef = useRef(Date.now());
    const hasGreetedRef = useRef(false);
    const lastFocusAlertRef = useRef(0);
    const pathname = usePathname();

    // 1. Activity Monitor (Idle Logic)
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);

        const idleInterval = setInterval(() => {
            const now = Date.now();
            const idleTime = now - lastActivityRef.current;
            const twentyMinutes = 20 * 60 * 1000;

            if (idleTime > twentyMinutes && !isRunning && activeMode === 'none') {
                triggerChumToast(
                    "Hey, still there? Don't let the void consume your focus. Maybe a quick stretch?",
                    "info"
                );
                // Reset to avoid spam
                lastActivityRef.current = now;
            }
        }, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            clearInterval(idleInterval);
        };
    }, [isRunning, activeMode, triggerChumToast]);

    // 2. Time-based & Initial Greetings
    useEffect(() => {
        if (hasGreetedRef.current) return;

        const now = new Date();
        const hours = now.getHours();
        const today = now.toISOString().split('T')[0];

        // Morning Greeting (5am - 10am)
        if (hours >= 5 && hours < 10) {
            triggerChumToast(
                "Good morning! The morning light is perfect for deep work. Ready to forge some new shards?",
                "success"
            );
            sendLocalNotification("Morning Sanctuary", "Ready for a productive day?");
            hasGreetedRef.current = true;
        } 
        // Night Owl (11pm - 4am)
        else if (hours >= 23 || hours < 4) {
            triggerChumToast(
                "Burning the midnight oil? Your brain needs rest to crystallize your learning. Don't stay up too late!",
                "warning"
            );
            hasGreetedRef.current = true;
        }

        // Planning reminder
        if (lastPlannedDate !== today && pathname === '/dashboard') {
            setTimeout(() => {
                triggerChumToast(
                    "I notice you haven't planned your day yet. A clear path makes for a peaceful mind.",
                    "info",
                    () => { /* Could open planning modal here */ }
                );
            }, 3000);
        }

    }, [pathname, lastPlannedDate, triggerChumToast, sendLocalNotification]);

    // 3. Focus Score Monitor
    useEffect(() => {
        if (focusScore < 40 && Date.now() - lastFocusAlertRef.current > 30 * 60 * 1000) {
            triggerChumToast(
                "I notice your focus score is quite low. Perhaps a 5-minute break would help reset your neural pathways?",
                "warning"
            );
            lastFocusAlertRef.current = Date.now();
        }
    }, [focusScore, triggerChumToast]);

    // 4. Task Milestones
    useEffect(() => {
        const completedToday = tasks.filter(t => t.isCompleted).length; // This should ideally be 'completed today'
        if (completedToday === 5) {
            triggerChumToast(
                "Five chapters penned today! You're on a roll. Take a moment to appreciate your progress.",
                "success"
            );
        }
    }, [tasks, triggerChumToast]);

    return null; // Logic-only component
}

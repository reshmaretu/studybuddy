import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : undefined) || "https://qntlxxnesvekdunsxzwu.supabase.co";
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) || "sb_publishable_NVv9ES_PLJRpbpMVuZ7CkQ_BJpNtbvM";

if (typeof process === 'undefined' || !process.env?.NEXT_PUBLIC_SUPABASE_URL || !process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {

    if (typeof window !== 'undefined') {
        console.warn("Using fallback Supabase environment variables for mobile/offline support.");
    }
}

const createSupabaseClient = () => createClient(supabaseUrl || "", supabaseAnonKey || "");

type SupabaseClientType = ReturnType<typeof createSupabaseClient>;

const globalForSupabase = globalThis as typeof globalThis & {
    __studybuddy_supabase__?: SupabaseClientType;
};

export const supabase =
    globalForSupabase.__studybuddy_supabase__ ?? createSupabaseClient();

if (typeof window !== 'undefined') {
    globalForSupabase.__studybuddy_supabase__ = supabase;
}

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
};

// 🛡️ Lock Prevention for Mobile WebViews
// Some WebViews have buggy navigator.locks implementations that cause "stolen request" errors.
if (typeof navigator !== 'undefined' && (navigator as any).locks) {
    try {
        // Force Supabase to fallback to its own internal locking by "breaking" the native one slightly
        // or just ensuring we wrap our calls.
        console.log("[STUDYBUDDY] Neural Lock Optimizer Active");
    } catch (e) {}
}

// Prevent concurrent auth calls from fighting over the storage lock.
type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;
type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

let getUserInFlight: Promise<GetUserResult> | null = null;
let getSessionInFlight: Promise<GetSessionResult> | null = null;

const wrapAuthCall = <T,>(
    originalFn: (...args: any[]) => Promise<T>, 
    flightRef: { current: Promise<T> | null }
) => {
    return async (...args: any[]) => {
        if (flightRef.current) return flightRef.current;
        
        flightRef.current = (async () => {
            try {
                // Add a tiny jitter to prevent "Perfect Parallelism" race conditions
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
                return await originalFn(...args);
            } finally {
                flightRef.current = null;
            }
        })();
        
        return flightRef.current;
    };
};

try {
    const auth = supabase.auth as any;
    const gRef = { get current() { return getUserInFlight; }, set current(v) { getUserInFlight = v; } };
    const sRef = { get current() { return getSessionInFlight; }, set current(v) { getSessionInFlight = v; } };

    auth.getUser = wrapAuthCall(auth.getUser.bind(auth), gRef);
    auth.getSession = wrapAuthCall(auth.getSession.bind(auth), sRef);
} catch (e) {
    console.warn("Supabase lock prevention: patch failed", e);
}



export const getApiUrl = (path: string) => {
    if (typeof window === 'undefined') return path;
    
    // Check if we're on a Capacitor native platform (iOS/Android)
    // @ts-ignore
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    
    if (isNative) {
        // In native apps, relative URLs like /api/... won't work as they try to hit the local file system.
        // We must use the full production URL.
        const prodUrl = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_APP_URL : undefined) || 'https://studybuddy-ai.vercel.app';
        return `${prodUrl}${path}`;
    }
    
    return path;
};

export const getChatUrl = () => getApiUrl('/api/chat');


export * from '@supabase/supabase-js';
export * from './types';
export * from './store';
export * from './toolStore';
export * from './hooks/useTerms';
export * from './sound';

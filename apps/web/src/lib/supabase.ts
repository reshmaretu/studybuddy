import { createClient } from '@supabase/supabase-js';

// 1. Fallbacks for mobile/offline environments where env vars might be missing
const supabaseUrl = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : undefined) || "https://qntlxxnesvekdunsxzwu.supabase.co";
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) || "sb_publishable_NVv9ES_PLJRpbpMVuZ7CkQ_BJpNtbvM";

// 2. Soft safety check for development
if (typeof process === 'undefined' || !process.env?.NEXT_PUBLIC_SUPABASE_URL || !process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {

    if (typeof window !== 'undefined') {
        console.warn("Using fallback Supabase environment variables for mobile/offline support.");
    }
}


// 3. Create a browser singleton to avoid multiple GoTrueClient instances
const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);

type SupabaseClientType = ReturnType<typeof createSupabaseClient>;

const globalForSupabase = globalThis as typeof globalThis & {
    __studybuddy_supabase__?: SupabaseClientType;
};

export const supabase =
    globalForSupabase.__studybuddy_supabase__ ?? createSupabaseClient();

if (typeof window !== 'undefined') {
    globalForSupabase.__studybuddy_supabase__ = supabase;
}

// Prevent concurrent auth calls from fighting over the storage lock.
type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;
type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

let getUserInFlight: Promise<GetUserResult> | null = null;
let getSessionInFlight: Promise<GetSessionResult> | null = null;

try {
    const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
    (supabase.auth as { getUser: typeof supabase.auth.getUser }).getUser = async (...args) => {
        if (getUserInFlight) return getUserInFlight;
        getUserInFlight = originalGetUser(...args).finally(() => {
            getUserInFlight = null;
        });
        return getUserInFlight;
    };
} catch (e) {
    console.warn("Supabase lock prevention: getUser could not be patched", e);
}

try {
    const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
    (supabase.auth as { getSession: typeof supabase.auth.getSession }).getSession = async (...args) => {
        if (getSessionInFlight) return getSessionInFlight;
        getSessionInFlight = originalGetSession(...args).finally(() => {
            getSessionInFlight = null;
        });
        return getSessionInFlight;
    };
} catch (e) {
    console.warn("Supabase lock prevention: getSession could not be patched", e);
}
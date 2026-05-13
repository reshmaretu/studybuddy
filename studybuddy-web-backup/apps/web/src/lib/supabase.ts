import { createClient } from '@supabase/supabase-js';

// 1. NO fallbacks. If Next.js can't find the keys, we want to know immediately.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Strict Safety Check
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("CRITICAL: Missing NEXT_PUBLIC_SUPABASE environment variables! Check Vercel dashboard.");
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

const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);

(supabase.auth as { getUser: typeof supabase.auth.getUser }).getUser = async (...args) => {
    if (getUserInFlight) return getUserInFlight;
    getUserInFlight = originalGetUser(...args).finally(() => {
        getUserInFlight = null;
    });
    return getUserInFlight;
};

(supabase.auth as { getSession: typeof supabase.auth.getSession }).getSession = async (...args) => {
    if (getSessionInFlight) return getSessionInFlight;
    getSessionInFlight = originalGetSession(...args).finally(() => {
        getSessionInFlight = null;
    });
    return getSessionInFlight;
};
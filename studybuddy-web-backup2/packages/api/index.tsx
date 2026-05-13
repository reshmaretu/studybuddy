import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
        console.warn("Missing Supabase environment variables.");
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

export * from '@supabase/supabase-js';
export * from './types';
export * from './store';
export * from './toolStore';
export * from './hooks/useTerms';
export * from './sound';

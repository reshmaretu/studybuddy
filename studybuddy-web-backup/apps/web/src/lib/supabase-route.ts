import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

type RouteSupabase = {
  supabase: SupabaseClient;
  user: User | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const createAuthedClient = (token: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export const getRouteSupabase = async (req: NextRequest): Promise<RouteSupabase> => {
  const cookieStore = await cookies();
  const cookieClient = (createRouteHandlerClient as unknown as (args: {
    cookies: () => unknown;
  }) => SupabaseClient)({
    cookies: () => cookieStore,
  });
  const { data: { session } } = await cookieClient.auth.getSession();

  if (session?.user) {
    return { supabase: cookieClient, user: session.user };
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { supabase: cookieClient, user: null };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { supabase: cookieClient, user: null };
  }

  const headerClient = createAuthedClient(token);
  if (!headerClient) {
    return { supabase: cookieClient, user: null };
  }

  const { data: { user } } = await headerClient.auth.getUser(token);
  return { supabase: user ? headerClient : cookieClient, user: user ?? null };
};

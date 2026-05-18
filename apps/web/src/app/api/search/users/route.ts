import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Static generation with no caching for dynamic search endpoint
export const dynamic = "force-static";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qntlxxnesvekdunsxzwu.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NVv9ES_PLJRpbpMVuZ7CkQ_BJpNtbvM";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json([]);
    }

    // Get current user if possible
    const authHeader = req.headers.get("Authorization");
    let currentUserId: string | null = searchParams.get("userId");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });
        const { data: { user } } = await tempClient.auth.getUser();
        if (user?.id) {
          currentUserId = user.id;
        }
      } catch (e) {
        console.warn("api/search/users token validation failed:", e);
      }
    }

    // Use supabaseAdmin to bypass RLS restrictions on profiles
    const client = supabaseAdmin;

    // Search profiles by display_name or full_name
    let query = client
      .from("profiles")
      .select("id, display_name, full_name, avatar_url, status", { count: "exact" })
      .or(`display_name.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);

    if (currentUserId) {
      query = query.neq("id", currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Search users database error:", error.message, error.details);
      // Return empty array on error instead of 500 for graceful degradation
      return NextResponse.json([]);
    }

    const results = data || [];
    console.log(`Search query "${q}" returned ${results.length} results`);
    return NextResponse.json(results);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Search users exception:", errMsg);
    // Return empty array on any error
    return NextResponse.json([]);
  }
}

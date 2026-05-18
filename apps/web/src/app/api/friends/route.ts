import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Static generation with no caching for dynamic friends endpoint
export const dynamic = "force-static";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qntlxxnesvekdunsxzwu.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NVv9ES_PLJRpbpMVuZ7CkQ_BJpNtbvM";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'requested', 'pending', 'friends'

    // Get current user
    const authHeader = req.headers.get("Authorization");
    let currentUserId = searchParams.get("userId");
    let client = supabaseAdmin;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        client = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          currentUserId = user.id;
        }
      } catch (e) {
        console.warn("api/friends getUser token check failed", e);
        client = supabaseAdmin;
      }
    }

    if (!currentUserId) {
      const { data: fallbackUser } = await client.from("profiles").select("id").limit(1).single();
      if (fallbackUser) {
        currentUserId = fallbackUser.id;
      }
    }

    if (!currentUserId) {
      return NextResponse.json([], { status: 401 });
    }

    let query = client.from("user_friendships").select("*");

    if (type === "requested") {
      // Requests sent BY the current user
      query = query.eq("requester_id", currentUserId).eq("status", "pending");
    } else if (type === "pending") {
      // Incoming requests sent TO the current user
      query = query
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .neq("requester_id", currentUserId)
        .eq("status", "pending");
    } else if (type === "friends") {
      // Accepted friendships
      query = query
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq("status", "accepted");
    } else {
      return NextResponse.json([]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch friends error:", error);
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Fetch friends exception:", error);
    return NextResponse.json([], { status: 500 });
  }
}

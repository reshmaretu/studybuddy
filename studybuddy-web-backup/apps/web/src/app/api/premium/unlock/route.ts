import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing identity coordinate." });
    }

    // In a real app, you would verify the token/payment.
    // For the Expo demo, any valid-looking token is accepted.
    
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_premium: true })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ success: false, error: "Cloud sync failed. Try again." });
    }

    return NextResponse.json({ success: true, message: "Garden soul blossomed!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Relay error." });
  }
}

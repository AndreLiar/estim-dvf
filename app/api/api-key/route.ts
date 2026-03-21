import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateApiKey } from "@/lib/apiKey";

// GET — return current API key info
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data } = await supabaseAdmin.auth.getUser(token);
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pro } = await supabaseAdmin
    .from("pro_users")
    .select("plan, api_key, api_usage_count, api_usage_reset_at, active")
    .eq("email", user.email!)
    .single();

  if (!pro?.active) {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  return NextResponse.json({
    apiKey: pro.api_key,
    plan: pro.plan,
    usageCount: pro.api_usage_count ?? 0,
    usageLimit: pro.plan === "api" ? 10000 : null,
    resetAt: pro.api_usage_reset_at,
  });
}

// POST — generate a new API key (or return existing)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data } = await supabaseAdmin.auth.getUser(token);
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pro } = await supabaseAdmin
    .from("pro_users")
    .select("plan, api_key, active")
    .eq("email", user.email!)
    .single();

  if (!pro?.active) {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  // Generate new key (rotate)
  const newKey = generateApiKey();
  await supabaseAdmin
    .from("pro_users")
    .update({ api_key: newKey, api_usage_count: 0 })
    .eq("email", user.email!);

  return NextResponse.json({ apiKey: newKey });
}

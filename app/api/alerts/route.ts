import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchDvfStats } from "@/lib/dvf";

async function getProUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (!data.user) return null;
  const { data: pro } = await supabaseAdmin
    .from("pro_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .single();
  return pro ? data.user : null;
}

export async function GET(req: NextRequest) {
  const user = await getProUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("price_alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getProUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code_postal, type_local, threshold_pct } = await req.json();
  if (!code_postal || !/^\d{5}$/.test(code_postal)) {
    return NextResponse.json({ error: "Code postal invalide" }, { status: 400 });
  }

  // Fetch current median as baseline
  const stats = await fetchDvfStats(code_postal, type_local ?? "Appartement");
  const last_median = stats?.medianPerM2 ?? null;

  const { data, error } = await supabaseAdmin
    .from("price_alerts")
    .insert({
      user_id: user.id,
      code_postal,
      type_local: type_local ?? "Appartement",
      threshold_pct: threshold_pct ?? 5,
      last_median,
      last_checked: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

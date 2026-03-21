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
    .from("portfolio_properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getProUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check limit (20 properties for Pro)
  const { count } = await supabaseAdmin
    .from("portfolio_properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: "Limite de 20 biens atteinte" }, { status: 429 });
  }

  const body = await req.json();
  const { label, adresse, code_postal, type_local, surface_m2, purchase_price, purchase_date } = body;

  if (!code_postal || !surface_m2 || !purchase_price || !purchase_date) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // Get current DVF median
  const stats = await fetchDvfStats(code_postal, type_local ?? "Appartement");
  const current_median_per_m2 = stats?.medianPerM2 ?? null;

  const { data, error } = await supabaseAdmin
    .from("portfolio_properties")
    .insert({
      user_id: user.id,
      label,
      adresse,
      code_postal,
      type_local: type_local ?? "Appartement",
      surface_m2,
      purchase_price,
      purchase_date,
      current_median_per_m2,
      estimate_updated_at: current_median_per_m2 ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

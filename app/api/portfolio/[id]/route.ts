import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchDvfStats } from "@/lib/dvf";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await supabaseAdmin.from("portfolio_properties").delete().eq("id", id).eq("user_id", data.user.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Refresh estimate for one property
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: prop } = await supabaseAdmin
    .from("portfolio_properties")
    .select("code_postal, type_local")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .single();

  if (!prop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await fetchDvfStats(prop.code_postal, prop.type_local);
  if (!stats) return NextResponse.json({ error: "Données DVF insuffisantes" }, { status: 404 });

  const { data: updated } = await supabaseAdmin
    .from("portfolio_properties")
    .update({ current_median_per_m2: stats.medianPerM2, estimate_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json(updated);
}

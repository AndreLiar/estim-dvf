import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchDvfStats } from "@/lib/dvf";

const CACHE_TTL_HOURS = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code_postal = searchParams.get("code_postal")?.trim();
  const type_local = searchParams.get("type") ?? "Appartement";

  if (!code_postal || !/^\d{5}$/.test(code_postal)) {
    return NextResponse.json({ error: "Code postal invalide" }, { status: 400 });
  }

  // Check cache
  const { data: cached } = await supabaseAdmin
    .from("market_cache")
    .select("*")
    .eq("code_postal", code_postal)
    .eq("type_local", type_local)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age < CACHE_TTL_HOURS * 3600 * 1000) {
      return NextResponse.json({ ...cached, fromCache: true });
    }
  }

  // Fetch fresh from DVF
  const stats = await fetchDvfStats(code_postal, type_local, 5);
  if (!stats) {
    return NextResponse.json({ error: "Données insuffisantes pour ce secteur" }, { status: 404 });
  }

  const row = {
    code_postal,
    type_local,
    cached_at: new Date().toISOString(),
    price_history: stats.priceHistory,
    median_12m: stats.medianPerM2,
    median_prev_12m: null,
    volume_12m: stats.volume,
    volume_prev_12m: null,
    momentum_pct: stats.momentum12m,
    city_name: stats.cityName,
  };

  await supabaseAdmin.from("market_cache").upsert(row, { onConflict: "code_postal,type_local" });

  return NextResponse.json({ ...row, priceHistory: stats.priceHistory, fromCache: false });
}

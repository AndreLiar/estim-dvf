import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validateApiKey } from "@/lib/apiKey";

const DVF_RESOURCE_ID = "d7933994-2c66-4131-a4da-cf7cd18040a4";
const TABULAR_API = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE_ID}/data/`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.trim();
  const type = searchParams.get("type");
  const surface = parseFloat(searchParams.get("surface") || "0");

  if (!postalCode || !type || !surface || surface <= 0) {
    return NextResponse.json({ error: "Paramètres manquants ou invalides." }, { status: 400 });
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return NextResponse.json({ error: "Code postal invalide (5 chiffres requis)." }, { status: 400 });
  }

  // --- Auth: API key takes priority, then Supabase JWT ---
  let userId: string | null = null;
  let isPro = false;
  let apiKeyUsage: { count: number; limit: number | null } | null = null;

  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const result = await validateApiKey(apiKeyHeader);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    isPro = true;
    apiKeyUsage = { count: result.usageCount!, limit: result.usageLimit ?? null };
  } else {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Rate limiting for non-API-key requests
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const { allowed, remaining, isPro: proStatus } = await checkRateLimit(ip, userId);
    isPro = proStatus;

    if (!allowed) {
      return NextResponse.json(
        { error: "Limite gratuite atteinte (5/jour). Connectez-vous et passez en Pro pour un accès illimité.", upgrade: true },
        { status: 429 }
      );
    }

    if (!isPro) {
      // attach remaining for free users
      (req as unknown as { _remaining: number })._remaining = remaining;
    }
  }

  try {
    const params = new URLSearchParams({
      code_postal__exact: postalCode,
      type_local__exact: type,
      page_size: "200",
    });

    const res = await fetch(`${TABULAR_API}?${params}`, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("DVF API error:", res.status, text.slice(0, 200));
      return NextResponse.json({ error: `Service DVF indisponible (${res.status}).` }, { status: 502 });
    }

    const json = await res.json();
    const rows: Record<string, string | number | null>[] = json.data ?? [];

    const valid = rows.filter(
      (r) => r.valeur_fonciere && Number(r.valeur_fonciere) > 10000 &&
             r.surface_reelle_bati && Number(r.surface_reelle_bati) > 5
    );

    if (valid.length < 3) {
      return NextResponse.json(
        { error: `Pas assez de données pour ${postalCode} (${type}). Essayez un code postal voisin.` },
        { status: 404 }
      );
    }

    const cityName = String(valid[0].nom_commune ?? postalCode);

    const pricesPerM2 = valid
      .map((r) => Number(r.valeur_fonciere) / Number(r.surface_reelle_bati))
      .filter((p) => p > 100 && p < 50000);

    pricesPerM2.sort((a, b) => a - b);

    const len = pricesPerM2.length;
    const median = pricesPerM2[Math.floor(len / 2)];
    const p10 = pricesPerM2[Math.floor(len * 0.1)];
    const p90 = pricesPerM2[Math.floor(len * 0.9)];
    const avg = pricesPerM2.reduce((a, b) => a + b, 0) / len;

    const dates = valid.map((r) => String(r.date_mutation ?? "")).filter(Boolean).sort().reverse();
    const lastSaleDate = dates[0] ?? null;

    const byYear: Record<string, number[]> = {};
    for (const r of valid) {
      const year = String(r.date_mutation ?? "").slice(0, 4);
      if (!year) continue;
      const ppm2 = Number(r.valeur_fonciere) / Number(r.surface_reelle_bati);
      if (ppm2 > 100 && ppm2 < 50000) {
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(ppm2);
      }
    }

    const priceHistory = Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, prices]) => ({
        year,
        medianPricePerM2: Math.round(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]),
      }));

    const response: Record<string, unknown> = {
      postalCode,
      city: cityName,
      type,
      surface,
      medianPricePerM2: Math.round(median),
      avgPricePerM2: Math.round(avg),
      estimatedPrice: Math.round(median * surface),
      estimatedMin: Math.round(p10 * surface),
      estimatedMax: Math.round(p90 * surface),
      comparableSales: valid.length,
      lastSaleDate,
      isPro,
      priceHistory: isPro ? priceHistory : null,
    };

    if (apiKeyUsage) {
      response.apiUsage = apiKeyUsage;
    } else {
      response.remainingToday = isPro ? null : (req as unknown as { _remaining?: number })._remaining ?? null;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Estimate error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

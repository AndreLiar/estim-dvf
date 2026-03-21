import { NextRequest, NextResponse } from "next/server";
import { fetchDvfStats } from "@/lib/dvf";
import { validateApiKey } from "@/services/apiKeys";
import { getUserFromToken } from "@/services/auth";
import { checkRateLimit } from "@/services/rateLimit";

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

  let isPro = false;
  let remainingToday: number | null = null;
  let apiUsage: { count: number; limit: number | null } | null = null;

  // API key auth takes priority
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader) {
    const result = await validateApiKey(apiKeyHeader);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    isPro = true;
    apiUsage = { count: result.usageCount!, limit: result.usageLimit ?? null };
  } else {
    // JWT auth (optional — just elevates to Pro if valid)
    let userId: string | undefined;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const user = await getUserFromToken(authHeader.slice(7));
      userId = user?.id;
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const limit = await checkRateLimit(ip, userId);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Limite gratuite atteinte (5/jour). Passez en Pro pour un accès illimité.", upgrade: true },
        { status: 429 }
      );
    }
    isPro = limit.isPro;
    remainingToday = limit.isPro ? null : limit.remaining;
  }

  try {
    const stats = await fetchDvfStats(postalCode, type, 3);

    if (!stats) {
      return NextResponse.json(
        { error: `Pas assez de données pour ${postalCode} (${type}). Essayez un code postal voisin.` },
        { status: 404 }
      );
    }

    const priceHistory = isPro
      ? stats.priceHistory.map((y) => ({ year: y.year, medianPricePerM2: y.medianPerM2 }))
      : null;

    const response = {
      postalCode,
      city: stats.cityName || postalCode,
      type,
      surface,
      medianPricePerM2: stats.medianPerM2,
      avgPricePerM2: stats.avgPerM2,
      estimatedPrice: Math.round(stats.medianPerM2 * surface),
      estimatedMin: Math.round(stats.p10PerM2 * surface),
      estimatedMax: Math.round(stats.p90PerM2 * surface),
      comparableSales: stats.volume,
      lastSaleDate: stats.lastSaleDate,
      isPro,
      priceHistory,
      remainingToday,
      ...(apiUsage ? { apiUsage } : {}),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Estimate error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

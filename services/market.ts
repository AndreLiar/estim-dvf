import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchDvfStats } from "@/lib/dvf";
import type { MarketCache, PropertyType } from "@/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function toMarketCache(row: Record<string, unknown>, fromCache: boolean): MarketCache {
  return {
    codePostal: row.code_postal as string,
    typeLocal: row.type_local as PropertyType,
    cachedAt: row.cached_at as string,
    medianPerM2: Number(row.median_per_m2),
    avgPerM2: Number(row.avg_per_m2),
    p10PerM2: Number(row.p10_per_m2),
    p90PerM2: Number(row.p90_per_m2),
    volume: Number(row.volume),
    momentum12m: row.momentum_12m != null ? Number(row.momentum_12m) : null,
    lastSaleDate: (row.last_sale_date as string) ?? null,
    cityName: (row.city_name as string) ?? "",
    priceHistory: (row.price_history as MarketCache["priceHistory"]) ?? [],
    fromCache,
  };
}

/**
 * Returns market stats for a postal code, using a 24h cache.
 * Falls back to a fresh DVF fetch if the cache is stale or missing.
 */
export async function getMarketStats(
  codePostal: string,
  typeLocal: PropertyType
): Promise<MarketCache | null> {
  // Try cache
  const { data: cached } = await supabaseAdmin
    .from("market_cache")
    .select("*")
    .eq("code_postal", codePostal)
    .eq("type_local", typeLocal)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      return toMarketCache(cached, true);
    }
  }

  // Fetch fresh from DVF
  const stats = await fetchDvfStats(codePostal, typeLocal, 5);
  if (!stats) return null;

  const row = {
    code_postal: codePostal,
    type_local: typeLocal,
    cached_at: new Date().toISOString(),
    median_per_m2: stats.medianPerM2,
    avg_per_m2: stats.avgPerM2,
    p10_per_m2: stats.p10PerM2,
    p90_per_m2: stats.p90PerM2,
    volume: stats.volume,
    momentum_12m: stats.momentum12m,
    last_sale_date: stats.lastSaleDate,
    city_name: stats.cityName,
    price_history: stats.priceHistory,
  };

  await supabaseAdmin
    .from("market_cache")
    .upsert(row, { onConflict: "code_postal,type_local" });

  return toMarketCache(row, false);
}

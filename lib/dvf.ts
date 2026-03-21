const DVF_RESOURCE_ID = "d7933994-2c66-4131-a4da-cf7cd18040a4";
const TABULAR_API = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE_ID}/data/`;

export interface DvfPriceYear {
  year: string;
  medianPerM2: number;
  volume: number;
}

export interface DvfStats {
  medianPerM2: number;
  avgPerM2: number;
  p10PerM2: number;
  p90PerM2: number;
  volume: number;
  priceHistory: DvfPriceYear[];
  momentum12m: number | null;
  lastSaleDate: string | null;
  cityName: string;
}

type DvfRow = Record<string, string | number | null>;

async function fetchPage(code_postal: string, type_local: string, page: number): Promise<DvfRow[]> {
  const params = new URLSearchParams({
    code_postal__exact: code_postal,
    type_local__exact: type_local,
    nature_mutation__exact: "Vente",
    page_size: "200",
    page: String(page),
  });
  const res = await fetch(`${TABULAR_API}?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function computeStats(rows: DvfRow[]): DvfStats | null {
  const valid = rows.filter(
    (r) =>
      r.valeur_fonciere && Number(r.valeur_fonciere) > 10000 &&
      r.surface_reelle_bati && Number(r.surface_reelle_bati) > 5
  );
  if (valid.length < 3) return null;

  const cityName = String(valid[0].nom_commune ?? "");
  const pricesPerM2 = valid
    .map((r) => Number(r.valeur_fonciere) / Number(r.surface_reelle_bati))
    .filter((p) => p > 100 && p < 50000)
    .sort((a, b) => a - b);

  if (pricesPerM2.length < 3) return null;

  const len = pricesPerM2.length;
  const median = pricesPerM2[Math.floor(len / 2)];
  const p10 = pricesPerM2[Math.floor(len * 0.1)];
  const p90 = pricesPerM2[Math.floor(len * 0.9)];
  const avg = pricesPerM2.reduce((a, b) => a + b, 0) / len;

  const dates = valid.map((r) => String(r.date_mutation ?? "")).filter(Boolean).sort().reverse();
  const lastSaleDate = dates[0] ?? null;

  // Year-by-year history
  const byYear: Record<string, number[]> = {};
  for (const r of valid) {
    const year = String(r.date_mutation ?? "").slice(0, 4);
    if (!year || year < "2015") continue;
    const ppm2 = Number(r.valeur_fonciere) / Number(r.surface_reelle_bati);
    if (ppm2 > 100 && ppm2 < 50000) {
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(ppm2);
    }
  }

  const priceHistory: DvfPriceYear[] = Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b);
      return {
        year,
        medianPerM2: Math.round(sorted[Math.floor(sorted.length / 2)]),
        volume: prices.length,
      };
    });

  // Momentum: last 12 months vs prior 12 months using date_mutation
  const now = new Date();
  const cutoff12 = new Date(now); cutoff12.setFullYear(cutoff12.getFullYear() - 1);
  const cutoff24 = new Date(now); cutoff24.setFullYear(cutoff24.getFullYear() - 2);

  const prices12m: number[] = [];
  const pricesPrev12m: number[] = [];

  for (const r of valid) {
    const d = String(r.date_mutation ?? "");
    if (!d) continue;
    const date = new Date(d);
    const ppm2 = Number(r.valeur_fonciere) / Number(r.surface_reelle_bati);
    if (ppm2 <= 100 || ppm2 >= 50000) continue;
    if (date >= cutoff12) prices12m.push(ppm2);
    else if (date >= cutoff24) pricesPrev12m.push(ppm2);
  }

  let momentum12m: number | null = null;
  if (prices12m.length >= 3 && pricesPrev12m.length >= 3) {
    const med12 = [...prices12m].sort((a, b) => a - b)[Math.floor(prices12m.length / 2)];
    const medPrev = [...pricesPrev12m].sort((a, b) => a - b)[Math.floor(pricesPrev12m.length / 2)];
    momentum12m = Math.round(((med12 - medPrev) / medPrev) * 1000) / 10;
  }

  return {
    medianPerM2: Math.round(median),
    avgPerM2: Math.round(avg),
    p10PerM2: Math.round(p10),
    p90PerM2: Math.round(p90),
    volume: valid.length,
    priceHistory,
    momentum12m,
    lastSaleDate,
    cityName,
  };
}

export async function fetchDvfStats(
  code_postal: string,
  type_local: string,
  pages = 3
): Promise<DvfStats | null> {
  const pageNums = Array.from({ length: pages }, (_, i) => i + 1);
  const results = await Promise.all(pageNums.map((p) => fetchPage(code_postal, type_local, p)));
  const allRows = results.flat();
  if (allRows.length === 0) return null;
  return computeStats(allRows);
}

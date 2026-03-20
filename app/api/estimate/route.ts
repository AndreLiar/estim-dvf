import { NextRequest, NextResponse } from "next/server";

const DVF_RESOURCE_ID = "d7933994-2c66-4131-a4da-cf7cd18040a4";
const TABULAR_API = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE_ID}/data/`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postalCode = searchParams.get("postalCode")?.trim();
  const type = searchParams.get("type"); // Appartement | Maison
  const surface = parseFloat(searchParams.get("surface") || "0");

  if (!postalCode || !type || !surface || surface <= 0) {
    return NextResponse.json({ error: "Paramètres manquants ou invalides." }, { status: 400 });
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return NextResponse.json({ error: "Code postal invalide (5 chiffres requis)." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      code_postal__exact: postalCode,
      type_local__exact: type,
      page_size: "500",
    });

    const url = `${TABULAR_API}?${params.toString()}`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Service DVF indisponible. Réessayez dans un instant." }, { status: 502 });
    }

    const json = await res.json();
    const rows: Record<string, string | number | null>[] = json.data ?? [];

    // Only keep rows with both a sale price and a surface area
    const valid = rows.filter(
      (r) =>
        r.valeur_fonciere &&
        Number(r.valeur_fonciere) > 10000 &&
        r.surface_reelle_bati &&
        Number(r.surface_reelle_bati) > 5
    );

    if (valid.length < 3) {
      return NextResponse.json(
        {
          error: `Pas assez de données pour le code postal ${postalCode} (${type}). Essayez un code postal voisin.`,
        },
        { status: 404 }
      );
    }

    // City name from first result
    const cityName = String(valid[0].nom_commune ?? postalCode);

    // Price per m² for each transaction
    const pricesPerM2 = valid
      .map((r) => Number(r.valeur_fonciere) / Number(r.surface_reelle_bati))
      .filter((p) => p > 100 && p < 50000); // sanity filter

    pricesPerM2.sort((a, b) => a - b);

    const len = pricesPerM2.length;
    const median = pricesPerM2[Math.floor(len / 2)];
    const p10 = pricesPerM2[Math.floor(len * 0.1)];
    const p90 = pricesPerM2[Math.floor(len * 0.9)];
    const avg = pricesPerM2.reduce((a, b) => a + b, 0) / len;

    // Most recent sale date
    const dates = valid
      .map((r) => String(r.date_mutation ?? ""))
      .filter(Boolean)
      .sort()
      .reverse();
    const lastSaleDate = dates[0] ?? null;

    return NextResponse.json({
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
      totalFound: json.meta?.total ?? rows.length,
      lastSaleDate,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

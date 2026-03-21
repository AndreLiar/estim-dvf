import { NextRequest, NextResponse } from "next/server";
import { getProUserFromToken } from "@/services/auth";
import { listProperties, addProperty } from "@/services/portfolio";
import { fetchDvfStats } from "@/lib/dvf";
import type { PropertyType } from "@/types";

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getProUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await listProperties(user.id);
  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getProUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, adresse, code_postal, type_local, surface_m2, purchase_price, purchase_date } = body;

  if (!code_postal || !surface_m2 || !purchase_price || !purchase_date) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const typeLocal = (type_local ?? "Appartement") as PropertyType;
  const stats = await fetchDvfStats(code_postal, typeLocal, 3);
  const currentMedianPerM2 = stats?.medianPerM2 ?? null;

  try {
    const property = await addProperty({
      userId: user.id,
      label,
      adresse,
      codePostal: code_postal,
      typeLocal,
      surfaceM2: Number(surface_m2),
      purchasePrice: Number(purchase_price),
      purchaseDate: purchase_date,
      currentMedianPerM2,
    });
    return NextResponse.json(property);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    const status = msg.includes("Limite") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

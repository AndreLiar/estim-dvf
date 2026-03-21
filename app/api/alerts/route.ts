import { NextRequest, NextResponse } from "next/server";
import { getProUserFromToken } from "@/services/auth";
import { listAlerts, createAlert } from "@/services/alerts";
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

  const alerts = await listAlerts(user.id);
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getProUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code_postal, type_local, threshold_pct } = await req.json();
  if (!code_postal || !/^\d{5}$/.test(code_postal)) {
    return NextResponse.json({ error: "Code postal invalide" }, { status: 400 });
  }

  const typeLocal = (type_local ?? "Appartement") as PropertyType;
  const stats = await fetchDvfStats(code_postal, typeLocal, 3);
  const lastMedian = stats?.medianPerM2 ?? null;

  try {
    const alert = await createAlert({
      userId: user.id,
      codePostal: code_postal,
      typeLocal,
      thresholdPct: threshold_pct ?? 5,
      lastMedian,
    });
    return NextResponse.json(alert);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/services/auth";
import { getProperty, refreshPropertyEstimate, removeProperty } from "@/services/portfolio";
import { fetchDvfStats } from "@/lib/dvf";

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await removeProperty(id, user.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prop = await getProperty(id, user.id);
  if (!prop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await fetchDvfStats(prop.codePostal, prop.typeLocal, 3);
  if (!stats) return NextResponse.json({ error: "Données DVF insuffisantes" }, { status: 404 });

  try {
    const updated = await refreshPropertyEstimate(id, user.id, stats.medianPerM2);
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

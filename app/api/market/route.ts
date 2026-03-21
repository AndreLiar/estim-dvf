import { NextRequest, NextResponse } from "next/server";
import { getMarketStats } from "@/services/market";
import type { PropertyType } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code_postal = searchParams.get("code_postal")?.trim();
  const type = (searchParams.get("type") ?? "Appartement") as PropertyType;

  if (!code_postal || !/^\d{5}$/.test(code_postal)) {
    return NextResponse.json({ error: "Code postal invalide" }, { status: 400 });
  }

  const stats = await getMarketStats(code_postal, type);
  if (!stats) {
    return NextResponse.json({ error: "Données DVF insuffisantes pour ce code postal" }, { status: 404 });
  }

  return NextResponse.json(stats);
}

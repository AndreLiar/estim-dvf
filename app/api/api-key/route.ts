import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/services/auth";
import { getApiKeyInfo, rotateApiKey } from "@/services/apiKeys";

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const info = await getApiKeyInfo(user.email);
  if (!info) return NextResponse.json({ error: "No active subscription" }, { status: 403 });

  return NextResponse.json(info);
}

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const info = await getApiKeyInfo(user.email);
  if (!info) return NextResponse.json({ error: "No active subscription" }, { status: 403 });

  const newKey = await rotateApiKey(user.email);
  return NextResponse.json({ apiKey: newKey });
}

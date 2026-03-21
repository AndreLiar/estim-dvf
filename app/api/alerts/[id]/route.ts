import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/services/auth";
import { deactivateAlert } from "@/services/alerts";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserFromToken(auth.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deactivateAlert(id, user.id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getRegisteredUser, updateDesignPue } from "@/lib/server-data";

export async function POST(request: NextRequest) {
  if (!request.headers.get("oai-authenticated-user-id")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const user = await getRegisteredUser(request.headers);
  if (!user) return NextResponse.json({ error: "Registration required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { pue?: unknown };
  try {
    const design = await updateDesignPue(user, Number(body.pue));
    return NextResponse.json({ ok: true, design });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: message === "ROLE_REQUIRED" ? 403 : message === "INVALID_PUE" ? 400 : 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { registerCurrentUser } from "@/lib/server-data";

export async function POST(request: NextRequest) {
  try {
    const user = await registerCurrentUser(request.headers);
    return NextResponse.json({ ok: true, registered: true, role: user.role, teamId: user.teamId });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTHENTICATION_REQUIRED") return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 500 });
  }
}

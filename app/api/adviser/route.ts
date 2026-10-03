import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  if (!request.headers.get("oai-authenticated-user-id")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.toLowerCase() : "";
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });
  const answer = question.includes("pue") ? "The design assumes 1.22 PUE. This is an assumption, not measured performance. [A02] [C01]" : question.includes("grid") || question.includes("delay") ? "A 12-month grid delay raises modeled pre-opening cash to $663M. The firm utility offer remains an approval gate. [U01]" : "The current evidence does not establish that fact. Record it as an unresolved diligence item. [U01]";
  return NextResponse.json({ answer, citations: answer.match(/\[[A-Z0-9]+\]/g) ?? [] });
}

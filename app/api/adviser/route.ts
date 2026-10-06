import { NextRequest, NextResponse } from "next/server";
import { getDesign, getEvidence, getLatestApiMetrics, getRegisteredUser } from "@/lib/server-data";

export async function POST(request: NextRequest) {
  if (!request.headers.get("oai-authenticated-user-id")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const user = await getRegisteredUser(request.headers);
  if (!user) return NextResponse.json({ error: "Registration required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().toLowerCase() : "";
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });

  const [design, evidence, metrics] = await Promise.all([getDesign(user.teamId), getEvidence(), getLatestApiMetrics()]);
  const citation = (id: string) => evidence.some((row) => row.id === id) ? `[${id}]` : "";
  let answer: string;
  if (question.includes("pue")) {
    const facilityPower = design.itLoadMw * design.pue;
    const annualEnergy = facilityPower * 8760 / 1000;
    answer = `Your registered team design stores a PUE of ${design.pue.toFixed(2)} in D1. That produces ${facilityPower.toFixed(1)} MW facility demand and ${annualEnergy.toFixed(1)} GWh/year. This is a design assumption, not measured performance. ${citation("A02")} ${citation("C01")}`;
  } else if (question.includes("renewable") || question.includes("world bank") || question.includes("api")) {
    answer = metrics.length ? `The latest validated World Bank records stored in D1 are ${metrics.map((m) => `${m.country}: ${m.value.toFixed(1)}% (${m.reportingPeriod})`).join("; ")}. Retrieved ${metrics[0].retrievedAt}. ${citation("S06")}` : `No external-API metric has been persisted yet. An authorized team administrator must run the World Bank refresh. ${citation("S06")}`;
  } else if (question.includes("grid") || question.includes("delay")) {
    answer = `The firm utility offer remains an approval gate. The evidence does not verify the project-specific energization date, upgrade scope, or curtailment terms. ${citation("U01")}`;
  } else if (question.includes("govern") || question.includes("member") || question.includes("allocat") || question.includes("capacity")) {
    answer = `A nonprofit university consortium owns the facility. An independent operating board allocates compute, sets the two-part tariff, and admits new members. Sixty percent is contracted base capacity; 25% is a merit-reviewed research pool, 10% a protected teaching pool, and 5% an emergency reserve. No member may hold more than 20% of base shares without supermajority approval and incremental capacity charges. ${citation("A03")}`;
  } else if (question.includes("user") || question.includes("demand") || question.includes("gpu-hour") || question.includes("teaching")) {
    answer = `At 62% productive utilization, phase one supplies about 27.8 million productive GPU-hours per year. The provisional planning mix is 65% large-university training and secure research, 20% teaching, and 15% inference or intermittent research. This mix is an assumption until 12 months of telemetry and seven-year commitments covering 70% of capacity are verified. ${citation("A01")} ${citation("A04")}`;
  } else if (question.includes("why") || question.includes("recommend")) {
    answer = `The phased hybrid limits idle-capacity exposure while preserving control of steady research workloads. It delays phase two until utilization clears the defined gate. ${citation("A01")} ${citation("C01")}`;
  } else {
    answer = `The D1 evidence set does not establish that fact. Record it as an unresolved diligence item; the adviser will not invent a value or source. ${citation("U01")}`;
  }
  const citations = [...answer.matchAll(/\[([A-Z0-9]+)\]/g)].map((match) => match[1]);
  return NextResponse.json({ answer: answer.replace(/\s+/g, " ").trim(), citations, evidenceSource: "Cloudflare D1", designUpdatedAt: design.updatedAt });
}

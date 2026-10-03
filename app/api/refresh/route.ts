import { NextRequest, NextResponse } from "next/server";
const ENDPOINT = "https://api.worldbank.org/v2/country/CAN;USA;IRL/indicator/EG.ELC.RNEW.ZS?format=json&per_page=100&mrnev=1";
export async function POST(request: NextRequest) {
  if (!request.headers.get("oai-authenticated-user-id")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`World Bank returned ${response.status}`);
    const payload = await response.json() as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error("Unexpected API shape");
    const records = payload[1].filter((row: unknown) => { const item = row as { value?: unknown; date?: unknown; countryiso3code?: unknown }; return typeof item.value === "number" && typeof item.date === "string" && typeof item.countryiso3code === "string"; });
    if (!records.length) throw new Error("No valid numeric records");
    return NextResponse.json({ source: "World Bank WDI / IEA", retrievedAt: new Date().toISOString(), records });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refresh failed", retained: "seed evidence remains valid" }, { status: 502 });
  }
}

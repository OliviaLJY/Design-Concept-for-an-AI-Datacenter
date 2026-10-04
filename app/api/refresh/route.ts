import { NextRequest, NextResponse } from "next/server";
import { ensureSeedData, getLatestApiMetrics, getRawDatabase, getRegisteredUser } from "@/lib/server-data";

const ENDPOINT = "https://api.worldbank.org/v2/country/CAN;USA;IRL/indicator/EG.ELC.RNEW.ZS?format=json&per_page=100&mrnev=1";
const COUNTRY_NAMES: Record<string, string> = { CAN: "Canada", USA: "United States", IRL: "Ireland" };
type WorldBankRow = { value?: unknown; date?: unknown; countryiso3code?: unknown };

export async function POST(request: NextRequest) {
  if (!request.headers.get("oai-authenticated-user-id")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const user = await getRegisteredUser(request.headers);
  if (!user) return NextResponse.json({ error: "Registration required" }, { status: 403 });
  if (!["editor", "team_admin"].includes(user.role)) return NextResponse.json({ error: "Editor role required" }, { status: 403 });

  await ensureSeedData();
  const database = getRawDatabase();
  try {
    if (request.nextUrl.searchParams.get("simulateFailure") === "1") throw new Error("Simulated upstream failure for fallback verification");
    const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`World Bank returned ${response.status}`);
    const payload = await response.json() as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error("Unexpected API shape");
    const records = (payload[1] as WorldBankRow[]).filter((item) =>
      typeof item.value === "number" && Number.isFinite(item.value) && item.value >= 0 && item.value <= 100 &&
      typeof item.date === "string" && /^\d{4}$/.test(item.date) &&
      typeof item.countryiso3code === "string" && item.countryiso3code in COUNTRY_NAMES,
    ).map((item) => ({ countryCode: item.countryiso3code as string, country: COUNTRY_NAMES[item.countryiso3code as string], value: item.value as number, reportingPeriod: item.date as string }));
    const latestByCountry = Object.values(records.reduce<Record<string, (typeof records)[number]>>((acc, item) => {
      if (!acc[item.countryCode] || item.reportingPeriod > acc[item.countryCode].reportingPeriod) acc[item.countryCode] = item;
      return acc;
    }, {}));
    if (latestByCountry.length !== 3) throw new Error("Expected one valid record for each country");

    const retrievedAt = new Date().toISOString();
    await database.prepare("INSERT INTO sources (source_key, publisher, title, url, source_type, publication_date, accessed_at) VALUES ('API-WB-RENEWABLES', 'World Bank / IEA', 'Renewable electricity output (% of total)', ?, 'EXTERNAL_API', NULL, ?) ON CONFLICT(source_key) DO UPDATE SET accessed_at = excluded.accessed_at, url = excluded.url")
      .bind(ENDPOINT, retrievedAt).run();
    await database.batch(latestByCountry.map((item) => database.prepare("INSERT INTO metrics (country_id, metric_name, value, unit, reporting_period, source_id, retrieved_at, confidence, notes) SELECT c.id, 'renewable_electricity_output', ?, 'percent of total electricity output', ?, s.id, ?, 'API-validated', ? FROM countries c CROSS JOIN sources s WHERE c.name = ? AND s.source_key = 'API-WB-RENEWABLES'")
      .bind(item.value, item.reportingPeriod, retrievedAt, `Fetched from ${item.countryCode}; numeric range and reporting year validated.`, item.country)));
    return NextResponse.json({ ok: true, source: "World Bank WDI / IEA", endpoint: ENDPOINT, retrievedAt, records: latestByCountry, persistedTo: "Cloudflare D1 / metrics" });
  } catch (error) {
    const retained = await getLatestApiMetrics();
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refresh failed", retained, fallback: "No D1 writes were performed; the last valid records remain active." }, { status: 502 });
  }
}

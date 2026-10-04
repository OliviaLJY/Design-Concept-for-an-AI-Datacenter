import { NextResponse } from "next/server";
import { getDatabaseStatus, getLatestApiMetrics } from "@/lib/server-data";

export async function GET() {
  const [database, latestApiRecords] = await Promise.all([getDatabaseStatus(), getLatestApiMetrics()]);
  return NextResponse.json({ database, externalApi: { provider: "World Bank WDI / IEA", indicator: "EG.ELC.RNEW.ZS", latestApiRecords, validation: ["HTTP success", "expected JSON shape", "recognized country code", "numeric 0-100 range", "four-digit reporting year"], failurePolicy: "No write on failure; retain latest valid D1 rows." } });
}

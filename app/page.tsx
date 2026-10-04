import DecisionDashboard from "./decision-dashboard";
import { headers } from "next/headers";
import { getDatabaseStatus, getDesign, getEvidence, getLatestApiMetrics, getViewerIdentity } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const identity = await getViewerIdentity(requestHeaders);
  const [sources, design, apiMetrics, databaseStatus] = await Promise.all([getEvidence(), getDesign(identity.teamId ?? 0), getLatestApiMetrics(), getDatabaseStatus()]);
  return <DecisionDashboard initialSources={sources} initialDesign={design} initialIdentity={identity} initialApiMetrics={apiMetrics} databaseStatus={databaseStatus} />;
}

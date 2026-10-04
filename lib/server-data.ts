import { env } from "cloudflare:workers";

export type EvidenceRecord = {
  id: string;
  type: string;
  claim: string;
  publisher: string;
  date: string;
  url: string;
  confidence: string;
};

export type DesignRecord = {
  id: number;
  teamId: number;
  selectedCountry: string;
  itLoadMw: number;
  pue: number;
  coolingStrategy: string;
  backupStrategy: string;
  designSummary: string;
  updatedAt: string;
};

export type RegisteredUser = {
  id: number;
  authenticatedUserId: string;
  email: string | null;
  teamId: number;
  role: string;
  registeredAt: string;
};

export type ViewerIdentity = {
  authenticated: boolean;
  registered: boolean;
  email: string | null;
  role: string | null;
  teamId: number | null;
};

export type ApiMetric = {
  country: string;
  value: number;
  unit: string;
  reportingPeriod: string;
  retrievedAt: string;
  sourceKey: string;
};

const SOURCE_SEEDS = [
  ["S01", "Hydro-Quebec", "Rate L tariff benchmark", "https://www.hydroquebec.com/data/documents-donnees/pdf/rates-chart.pdf?v=HT-2025-v2", "FACT", "2026", "Quebec Rate L benchmark is 5.446 CAD cents/kWh for 120-kV service at 100% load factor.", "High"],
  ["S02", "Statistics Canada", "Electric power statistics, 2024", "https://www150.statcan.gc.ca/n1/daily-quotidien/251022/dq251022c-eng.pdf", "FACT", "2025-10-22", "Canada generated 63.9% of electricity from renewable sources in 2024.", "High"],
  ["S03", "Ireland CSO", "Data Centres Metered Electricity Consumption 2024", "https://www.cso.ie/en/releasesandpublications/ep/p-dcmec/datacentresmeteredelectricityconsumption2024/keyfindings/", "FACT", "2025-06-10", "Ireland data centres used 6,969 GWh and 22% of metered electricity in 2024.", "High"],
  ["S04", "Ireland CSO", "Environmental Indicators Ireland 2025", "https://www.cso.ie/en/releasesandpublications/ep/p-eiieee/environmentalindicatorsireland2025economyemissionsandenergy/keyfindings/", "FACT", "2025-12-19", "Ireland produced 40.2% of electricity from renewables in 2024.", "High"],
  ["S05", "U.S. EIA", "Electricity prices", "https://www.eia.gov/energyexplained/electricity/prices-and-factors-affecting-prices.php", "FACT", "2026-02", "The 2025 U.S. industrial electricity price averaged 8.62 cents/kWh.", "High"],
  ["S06", "World Bank / IEA", "Renewable electricity output metadata", "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/EG.ELC.RNEW.ZS", "FACT", "2025-03-25", "The World Bank indicator defines renewable output as generation from renewable plants divided by total generation.", "High"],
  ["A01", "Team model", "Phase-one utilization assumption", "/#economics", "ASSUMPTION", "2026-10-03", "Phase one contains 5,120 GPU equivalents and reaches 62% productive utilization.", "Medium"],
  ["A02", "Team model", "PUE assumption", "/#architecture", "ASSUMPTION", "2026-10-03", "Facility PUE reaches 1.22 with direct-to-chip liquid cooling and dry coolers.", "Medium"],
  ["A03", "Governance design", "Consortium ownership and allocation policy", "/#users-governance", "ASSUMPTION", "2026-10-04", "A nonprofit university consortium owns the facility; an independent board allocates capacity, sets prices, admits members, and protects shared teaching and research pools.", "Medium"],
  ["A04", "Demand model", "Phase-one user segmentation", "/#users-governance", "ASSUMPTION", "2026-10-04", "Phase-one demand is provisionally split 65% large-university training and secure research, 20% teaching, and 15% inference or intermittent research, pending 12 months of measured workload telemetry.", "Medium"],
  ["C01", "Deterministic model", "Annual energy calculation", "/#economics", "CALCULATION", "2026-10-03", "10 MW IT x 1.22 PUE x 8,760 hours = 106.9 GWh annual facility energy.", "High"],
  ["U01", "Due diligence", "Open utility diligence", "/#gates", "UNKNOWN", "Open", "Utility upgrade scope, energization date, curtailment terms, and project-specific tariff remain unverified.", "Open"],
] as const;

function db(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureSeedData() {
  const database = db();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    database.prepare("INSERT OR IGNORE INTO countries (name, region) VALUES (?, ?)").bind("Canada", "Quebec"),
    database.prepare("INSERT OR IGNORE INTO countries (name, region) VALUES (?, ?)").bind("United States", "Virginia"),
    database.prepare("INSERT OR IGNORE INTO countries (name, region) VALUES (?, ?)").bind("Ireland", "Dublin area"),
  ];

  for (const [key, publisher, title, url, type, publicationDate] of SOURCE_SEEDS) {
    statements.push(
      database
        .prepare("INSERT OR IGNORE INTO sources (source_key, publisher, title, url, source_type, publication_date, accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(key, publisher, title, url, type, publicationDate, now),
    );
  }

  statements.push(
    database.prepare("INSERT INTO designs (team_id, selected_country_id, it_load_mw, pue, cooling_strategy, backup_strategy, design_summary, updated_at) SELECT 0, id, 10, 1.22, ?, ?, ?, ? FROM countries WHERE name = ? AND NOT EXISTS (SELECT 1 FROM designs WHERE team_id = 0)")
      .bind("Direct-to-chip liquid cooling with dry coolers", "N+1 generators with workload shedding", "Phased hybrid: build 10 MW in Quebec after demand and grid gates clear.", now, "Canada"),
  );

  await database.batch(statements);

  const defaultDesign = await database.prepare("SELECT id FROM designs WHERE team_id = 0 LIMIT 1").first<{ id: number }>();
  if (!defaultDesign) throw new Error("Default design could not be initialized");

  const claimStatements = SOURCE_SEEDS.map(([key, , , , type, , claim, confidence]) =>
    database.prepare("INSERT INTO design_claims (design_id, claim_text, claim_type, source_id, status) SELECT ?, ?, ?, id, ? FROM sources WHERE source_key = ? AND NOT EXISTS (SELECT 1 FROM design_claims dc JOIN sources existing_source ON existing_source.id = dc.source_id WHERE dc.design_id = ? AND existing_source.source_key = ?)")
      .bind(defaultDesign.id, claim, type, confidence, key, defaultDesign.id, key),
  );
  await database.batch(claimStatements);
}

function requestUser(headers: Headers) {
  const userId = headers.get("oai-authenticated-user-id");
  const email = headers.get("oai-authenticated-user-email");
  return userId ? { userId, email } : null;
}

export async function getRegisteredUser(headers: Headers): Promise<RegisteredUser | null> {
  const identity = requestUser(headers);
  if (!identity) return null;
  await ensureSeedData();
  return db().prepare("SELECT id, authenticated_user_id AS authenticatedUserId, email, team_id AS teamId, role, registered_at AS registeredAt FROM users WHERE authenticated_user_id = ? LIMIT 1")
    .bind(identity.userId).first<RegisteredUser>();
}

export async function getViewerIdentity(headers: Headers): Promise<ViewerIdentity> {
  const identity = requestUser(headers);
  if (!identity) return { authenticated: false, registered: false, email: null, role: null, teamId: null };
  const user = await getRegisteredUser(headers);
  return {
    authenticated: true,
    registered: Boolean(user),
    email: identity.email,
    role: user?.role ?? null,
    teamId: user?.teamId ?? null,
  };
}

export async function registerCurrentUser(headers: Headers): Promise<RegisteredUser> {
  const identity = requestUser(headers);
  if (!identity) throw new Error("AUTHENTICATION_REQUIRED");
  await ensureSeedData();
  const existing = await getRegisteredUser(headers);
  if (existing) return existing;

  const now = new Date().toISOString();
  const inserted = await db().prepare("INSERT INTO users (authenticated_user_id, email, team_id, role, registered_at) VALUES (?, ?, NULL, 'team_admin', ?) RETURNING id")
    .bind(identity.userId, identity.email, now).first<{ id: number }>();
  if (!inserted) throw new Error("Registration failed");

  await db().batch([
    db().prepare("UPDATE users SET team_id = ? WHERE id = ?").bind(inserted.id, inserted.id),
    db().prepare("INSERT INTO designs (team_id, selected_country_id, it_load_mw, pue, cooling_strategy, backup_strategy, design_summary, updated_at) SELECT ?, selected_country_id, it_load_mw, pue, cooling_strategy, backup_strategy, design_summary, ? FROM designs WHERE team_id = 0 LIMIT 1")
      .bind(inserted.id, now),
  ]);

  const registered = await getRegisteredUser(headers);
  if (!registered) throw new Error("Registration could not be verified");
  return registered;
}

export async function getDesign(teamId = 0): Promise<DesignRecord> {
  await ensureSeedData();
  const design = await db().prepare("SELECT d.id, d.team_id AS teamId, c.name AS selectedCountry, d.it_load_mw AS itLoadMw, d.pue, d.cooling_strategy AS coolingStrategy, d.backup_strategy AS backupStrategy, d.design_summary AS designSummary, d.updated_at AS updatedAt FROM designs d LEFT JOIN countries c ON c.id = d.selected_country_id WHERE d.team_id = ? ORDER BY d.id DESC LIMIT 1")
    .bind(teamId).first<DesignRecord>();
  if (design) return design;
  return getDesign(0);
}

export async function updateDesignPue(user: RegisteredUser, pue: number): Promise<DesignRecord> {
  if (user.role !== "team_admin") throw new Error("ROLE_REQUIRED");
  if (!Number.isFinite(pue) || pue < 1.05 || pue > 1.8) throw new Error("INVALID_PUE");
  const now = new Date().toISOString();
  await db().prepare("UPDATE designs SET pue = ?, updated_at = ? WHERE team_id = ?").bind(pue, now, user.teamId).run();
  return getDesign(user.teamId);
}

export async function getEvidence(): Promise<EvidenceRecord[]> {
  await ensureSeedData();
  const result = await db().prepare("SELECT s.source_key AS id, s.source_type AS type, dc.claim_text AS claim, s.publisher, COALESCE(s.publication_date, s.accessed_at) AS date, s.url, dc.status AS confidence FROM design_claims dc JOIN sources s ON s.id = dc.source_id JOIN designs d ON d.id = dc.design_id WHERE d.team_id = 0 ORDER BY s.source_key").all<EvidenceRecord>();
  return result.results;
}

export async function getLatestApiMetrics(): Promise<ApiMetric[]> {
  await ensureSeedData();
  const result = await db().prepare("SELECT c.name AS country, m.value, m.unit, m.reporting_period AS reportingPeriod, m.retrieved_at AS retrievedAt, s.source_key AS sourceKey FROM metrics m JOIN countries c ON c.id = m.country_id JOIN sources s ON s.id = m.source_id WHERE s.source_key = 'API-WB-RENEWABLES' AND m.id = (SELECT MAX(m2.id) FROM metrics m2 WHERE m2.country_id = m.country_id AND m2.metric_name = m.metric_name) ORDER BY c.name").all<ApiMetric>();
  return result.results;
}

export async function getDatabaseStatus() {
  await ensureSeedData();
  const [sources, designs, users, metrics] = await Promise.all([
    db().prepare("SELECT COUNT(*) AS count FROM sources").first<{ count: number }>(),
    db().prepare("SELECT COUNT(*) AS count FROM designs").first<{ count: number }>(),
    db().prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
    db().prepare("SELECT COUNT(*) AS count, MAX(retrieved_at) AS lastRefresh FROM metrics").first<{ count: number; lastRefresh: string | null }>(),
  ]);
  return {
    binding: "Cloudflare D1 / DB",
    persistent: true,
    counts: { sources: sources?.count ?? 0, designs: designs?.count ?? 0, users: users?.count ?? 0, apiMetrics: metrics?.count ?? 0 },
    lastRefresh: metrics?.lastRefresh ?? null,
  };
}

export function getRawDatabase() {
  return db();
}

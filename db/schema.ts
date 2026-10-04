import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }), authenticatedUserId: text("authenticated_user_id").notNull(), email: text("email"), teamId: integer("team_id"), role: text("role").notNull().default("viewer"), registeredAt: text("registered_at").notNull(),
}, (t) => [uniqueIndex("idx_users_authenticated_id").on(t.authenticatedUserId)]);
export const countries = sqliteTable("countries", { id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull().unique(), region: text("region") });
export const sources = sqliteTable("sources", { id: integer("id").primaryKey({ autoIncrement: true }), sourceKey: text("source_key").notNull().unique(), publisher: text("publisher").notNull(), title: text("title").notNull(), url: text("url").notNull(), sourceType: text("source_type").notNull(), publicationDate: text("publication_date"), accessedAt: text("accessed_at").notNull() });
export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }), countryId: integer("country_id").notNull().references(() => countries.id), metricName: text("metric_name").notNull(), value: real("value"), unit: text("unit").notNull(), reportingPeriod: text("reporting_period"), sourceId: integer("source_id").notNull().references(() => sources.id), retrievedAt: text("retrieved_at").notNull(), confidence: text("confidence"), notes: text("notes"),
}, (t) => [index("idx_metrics_country_metric").on(t.countryId, t.metricName)]);
export const designs = sqliteTable("designs", { id: integer("id").primaryKey({ autoIncrement: true }), teamId: integer("team_id").notNull(), selectedCountryId: integer("selected_country_id").references(() => countries.id), itLoadMw: real("it_load_mw").notNull(), pue: real("pue").notNull(), coolingStrategy: text("cooling_strategy"), backupStrategy: text("backup_strategy"), designSummary: text("design_summary"), updatedAt: text("updated_at").notNull() }, (t) => [uniqueIndex("idx_designs_team_id").on(t.teamId)]);
export const designClaims = sqliteTable("design_claims", {
  id: integer("id").primaryKey({ autoIncrement: true }), designId: integer("design_id").notNull().references(() => designs.id), claimText: text("claim_text").notNull(), claimType: text("claim_type").notNull(), sourceId: integer("source_id").references(() => sources.id), status: text("status").notNull(),
}, (t) => [index("idx_claims_design").on(t.designId)]);

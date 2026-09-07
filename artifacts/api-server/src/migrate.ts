/**
 * Standalone database migration runner.
 *
 * Uses drizzle-orm's built-in migrator — reads the SQL files from
 * lib/db/migrations/ and applies any that haven't been applied yet.
 * Safe to run multiple times (idempotent).
 *
 * Usage inside Docker:
 *   node artifacts/api-server/dist/migrate.mjs
 *
 * Required env var: DATABASE_URL
 * Optional env var: MIGRATIONS_DIR (override path to SQL folder)
 */

import { pool } from "@workspace/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Validate required env vars ────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error(
    "[migrate] ERROR: DATABASE_URL environment variable is not set.",
  );
  process.exit(1);
}

// ── Resolve migrations folder ─────────────────────────────────────────────────
// At runtime __dirname → /app/artifacts/api-server/dist
// Migrations are copied to  /app/lib/db/migrations by the Dockerfile runner stage
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder =
  process.env.MIGRATIONS_DIR ??
  path.resolve(__dirname, "../../../lib/db/migrations");

console.log("[migrate] Migrations folder:", migrationsFolder);
console.log("[migrate] Connecting to database…");

const db = drizzle(pool);

try {
  console.log("[migrate] Running migrations…");
  await migrate(db, {
    migrationsFolder,
    migrationsTable: "__drizzle_migrations",
  });
  console.log("[migrate] ✅ All migrations applied successfully.");
} catch (err) {
  console.error("[migrate] ❌ Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}

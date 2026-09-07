import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";

/**
 * Safe, idempotent schema migrations — runs at every startup.
 * Uses IF NOT EXISTS / IF EXISTS so re-running is always harmless.
 * This ensures production DBs stay in sync without a manual migrate step.
 */
async function runSafeMigrations() {
  try {
    // 0001: NOEST shipment tracking columns
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_provider text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS noest_shipment_id text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS sent_to_carrier_at timestamptz`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_tracking_sync_at timestamptz`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz`);

    // 0003: Shipping metadata columns
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_wilaya_code text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_wilaya_name text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_office_id integer`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_office_name text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_min_days integer`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_max_days integer`);

    // 0004: Normalize delivery_type values
    await db.execute(sql`UPDATE orders SET delivery_type = 'home'   WHERE delivery_type = 'domicile'`);
    await db.execute(sql`UPDATE orders SET delivery_type = 'office' WHERE delivery_type = 'stop_desk'`);

    // shipping_rates columns (0002 / 0004)
    await db.execute(sql`ALTER TABLE shipping_rates ADD COLUMN IF NOT EXISTS office_delivery_enabled boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE shipping_rates ADD COLUMN IF NOT EXISTS office_delivery_price numeric(10,2) NOT NULL DEFAULT 0`);

    // Storefront quick services managed from admin settings
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS services_section_title text NOT NULL DEFAULT 'Nos services en ligne'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS flexy_title text NOT NULL DEFAULT 'Application Flexy'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS flexy_description text NOT NULL DEFAULT 'Téléchargez notre application Flexy'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS flexy_button_text text NOT NULL DEFAULT 'Télécharger l''application'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS flexy_url text`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS flexy_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_title text NOT NULL DEFAULT 'Paiement en ligne'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_description text NOT NULL DEFAULT 'Payez rapidement et en toute sécurité'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_button_text text NOT NULL DEFAULT 'Payer maintenant'`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_url text`);
    await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_enabled boolean NOT NULL DEFAULT false`);

    logger.info("Safe migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "Safe migrations failed — server will still start");
  }
}

async function seedSuperAdmin() {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];
  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const [existingAdmin] = await db
      .select()
      .from(adminUsersTable)
      .where(
        or(
          eq(adminUsersTable.username, "superadmin"),
          eq(adminUsersTable.role, "super_admin"),
          eq(adminUsersTable.email, normalizedEmail),
        ),
      )
      .limit(1);

    if (existingAdmin) {
      await db
        .update(adminUsersTable)
        .set({
          email: normalizedEmail,
          passwordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(adminUsersTable.id, existingAdmin.id));
    } else {
      await db.insert(adminUsersTable).values({
        fullName: "Super Admin",
        username: "superadmin",
        email: normalizedEmail,
        passwordHash,
        role: "super_admin",
        permissions: [],
        isActive: true,
        mustChangePassword: false,
      });
    }

    logger.info({ email }, "Super Admin synced from env vars");
  } catch (err) {
    logger.error({ err }, "Failed to seed Super Admin");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runSafeMigrations().then(() => seedSuperAdmin()).then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});

import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./admin-users";

export const adminActivityLogTable = pgTable("admin_activity_log", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsersTable.id, {
    onDelete: "set null",
  }),
  adminName: text("admin_name"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

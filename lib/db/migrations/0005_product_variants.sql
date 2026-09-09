CREATE TABLE IF NOT EXISTS "product_options" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_options_product_name_unique" UNIQUE ("product_id", "name")
  ,CONSTRAINT "product_options_product_id_id_unique" UNIQUE ("id", "product_id")
);
CREATE INDEX IF NOT EXISTS "product_options_product_id_idx" ON "product_options" ("product_id");

CREATE TABLE IF NOT EXISTS "product_option_values" (
  "id" serial PRIMARY KEY,
  "option_id" integer NOT NULL REFERENCES "product_options"("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "value" text NOT NULL,
  "color_hex" text,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_option_values_option_value_unique" UNIQUE ("option_id", "value")
  ,CONSTRAINT "product_option_values_product_id_id_unique" UNIQUE ("id", "product_id")
);
CREATE INDEX IF NOT EXISTS "product_option_values_option_id_idx" ON "product_option_values" ("option_id");

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "price" numeric(10,2) NOT NULL,
  "compare_price" numeric(10,2),
  "stock" integer NOT NULL DEFAULT 0,
  "sku" text,
  "barcode" text,
  "image_url" text,
  "option_signature" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_variants_product_sku_unique" UNIQUE ("product_id", "sku")
  ,CONSTRAINT "product_variants_product_id_id_unique" UNIQUE ("id", "product_id")
  ,CONSTRAINT "product_variants_product_signature_unique" UNIQUE ("product_id", "option_signature")
);
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_product_active_idx" ON "product_variants" ("product_id", "is_active");

CREATE TABLE IF NOT EXISTS "product_variant_values" (
  "variant_id" integer NOT NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
  "option_value_id" integer NOT NULL REFERENCES "product_option_values"("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "product_variant_values_variant_value_unique" UNIQUE ("variant_id", "option_value_id")
);
CREATE INDEX IF NOT EXISTS "product_variant_values_variant_id_idx" ON "product_variant_values" ("variant_id");
CREATE INDEX IF NOT EXISTS "product_variant_values_option_value_id_idx" ON "product_variant_values" ("option_value_id");
ALTER TABLE "product_option_values" ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "option_signature" text;
ALTER TABLE "product_variant_values" ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products"("id") ON DELETE CASCADE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_options_product_id_id_unique') THEN
    ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_id_unique" UNIQUE ("id", "product_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_option_values_product_id_id_unique') THEN
    ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_id_id_unique" UNIQUE ("id", "product_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_product_id_id_unique') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_id_unique" UNIQUE ("id", "product_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_product_signature_unique') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_signature_unique" UNIQUE ("product_id", "option_signature");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variant_values_variant_product_fk') THEN
    ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_variant_product_fk" FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants" ("id", "product_id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variant_values_value_product_fk') THEN
    ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_value_product_fk" FOREIGN KEY ("option_value_id", "product_id") REFERENCES "product_option_values" ("id", "product_id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_option_values_option_product_fk') THEN
    ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_product_fk" FOREIGN KEY ("option_id", "product_id") REFERENCES "product_options" ("id", "product_id") ON DELETE CASCADE;
  END IF;
END $$;

-- Guest idempotency keys have a nullable user_id and therefore need their own
-- unique constraint; authenticated keys remain scoped by the existing order key.
CREATE UNIQUE INDEX IF NOT EXISTS "orders_guest_idempotency_key_unique"
  ON "orders" ("idempotency_key")
  WHERE "user_id" IS NULL AND "idempotency_key" IS NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_access_token" text;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_guest_access_token_unique" ON "orders" ("guest_access_token") WHERE "guest_access_token" IS NOT NULL;
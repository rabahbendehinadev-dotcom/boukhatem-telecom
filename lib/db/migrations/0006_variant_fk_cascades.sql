ALTER TABLE "product_variant_values"
  DROP CONSTRAINT IF EXISTS "product_variant_values_variant_product_fk";
ALTER TABLE "product_variant_values"
  ADD CONSTRAINT "product_variant_values_variant_product_fk"
  FOREIGN KEY ("variant_id", "product_id")
  REFERENCES "product_variants" ("id", "product_id")
  ON DELETE CASCADE;

ALTER TABLE "product_variant_values"
  DROP CONSTRAINT IF EXISTS "product_variant_values_value_product_fk";
ALTER TABLE "product_variant_values"
  ADD CONSTRAINT "product_variant_values_value_product_fk"
  FOREIGN KEY ("option_value_id", "product_id")
  REFERENCES "product_option_values" ("id", "product_id")
  ON DELETE CASCADE;

ALTER TABLE "product_option_values"
  DROP CONSTRAINT IF EXISTS "product_option_values_option_product_fk";
ALTER TABLE "product_option_values"
  ADD CONSTRAINT "product_option_values_option_product_fk"
  FOREIGN KEY ("option_id", "product_id")
  REFERENCES "product_options" ("id", "product_id")
  ON DELETE CASCADE;
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"icon_name" text,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);

CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"compare_price" numeric(10, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text,
	"barcode" text,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"has_discount" boolean DEFAULT false NOT NULL,
	"specifications" jsonb,
	"shipping_info" text,
	"warranty_info" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"category_id" integer,
	"brand_id" integer,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);

CREATE TABLE "product_option_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"color_hex" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_values_option_value_unique" UNIQUE("option_id","value"),
	CONSTRAINT "product_option_values_product_id_id_unique" UNIQUE("id","product_id")
);

CREATE TABLE "product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_options_product_name_unique" UNIQUE("product_id","name"),
	CONSTRAINT "product_options_product_id_id_unique" UNIQUE("id","product_id")
);

CREATE TABLE "product_variant_values" (
	"variant_id" integer NOT NULL,
	"option_value_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	CONSTRAINT "product_variant_values_variant_value_unique" UNIQUE("variant_id","option_value_id")
);

CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"compare_price" numeric(10, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text,
	"barcode" text,
	"image_url" text,
	"option_signature" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_product_id_id_unique" UNIQUE("id","product_id"),
	CONSTRAINT "product_variants_product_sku_unique" UNIQUE("product_id","sku"),
	CONSTRAINT "product_variants_product_signature_unique" UNIQUE("product_id","option_signature")
);

CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text,
	"guest_access_token" text,
	"user_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text DEFAULT 'cash_on_delivery' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_proof_url" text,
	"payment_notes" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"coupon_code" text,
	"shipping" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"notes" text,
	"delivery_type" text,
	"shipping_wilaya_code" text,
	"shipping_wilaya_name" text,
	"shipping_office_id" integer,
	"shipping_office_name" text,
	"estimated_delivery_min_days" integer,
	"estimated_delivery_max_days" integer,
	"delivery_provider" text,
	"noest_shipment_id" text,
	"tracking_number" text,
	"tracking_url" text,
	"label_url" text,
	"delivery_status" text,
	"sent_to_carrier_at" timestamp with time zone,
	"last_tracking_sync_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_guest_access_token_unique" UNIQUE("guest_access_token"),
	CONSTRAINT "orders_user_idempotency_key_unique" UNIQUE("user_id","idempotency_key")
);

CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_uses" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text,
	"mobile_image_url" text,
	"link_url" text,
	"button_text" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"desktop_position" text DEFAULT 'left' NOT NULL,
	"mobile_position" text DEFAULT 'left' NOT NULL,
	"show_title_desktop" boolean DEFAULT true NOT NULL,
	"show_button_desktop" boolean DEFAULT true NOT NULL,
	"show_title_mobile" boolean DEFAULT true NOT NULL,
	"show_button_mobile" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT 'BOUKHATEM TELECOM' NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"phone" text,
	"email" text,
	"address" text,
	"facebook" text,
	"instagram" text,
	"whatsapp" text,
	"meta_title" text,
	"meta_description" text,
	"shipping_cost" numeric(10, 2) DEFAULT '500' NOT NULL,
	"free_shipping_threshold" numeric(10, 2),
	"services_section_title" text DEFAULT 'Nos services en ligne' NOT NULL,
	"flexy_title" text DEFAULT 'Application Flexy' NOT NULL,
	"flexy_description" text DEFAULT 'Téléchargez notre application Flexy' NOT NULL,
	"flexy_button_text" text DEFAULT 'Télécharger l''application' NOT NULL,
	"flexy_url" text,
	"flexy_enabled" boolean DEFAULT false NOT NULL,
	"payment_title" text DEFAULT 'Paiement en ligne' NOT NULL,
	"payment_description" text DEFAULT 'Payez rapidement et en toute sécurité' NOT NULL,
	"payment_button_text" text DEFAULT 'Payer maintenant' NOT NULL,
	"payment_url" text,
	"payment_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_user_id_product_id_unique" UNIQUE("user_id","product_id")
);

CREATE TABLE "cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coupon_code" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login" timestamp,
	"last_login_ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);

CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "admin_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_login_attempts_identifier_unique" UNIQUE("identifier")
);

CREATE TABLE "admin_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer,
	"admin_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "shipping_offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"wilaya_code" text NOT NULL,
	"name" text NOT NULL,
	"commune" text,
	"address" text,
	"phone" text,
	"opening_hours" text,
	"carrier" text DEFAULT 'manual',
	"external_office_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "shipping_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"wilaya_code" text NOT NULL,
	"wilaya_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"home_delivery_enabled" boolean DEFAULT true NOT NULL,
	"office_delivery_enabled" boolean DEFAULT true NOT NULL,
	"home_delivery_price" integer DEFAULT 500 NOT NULL,
	"office_delivery_price" integer DEFAULT 350 NOT NULL,
	"min_delivery_days" integer DEFAULT 2 NOT NULL,
	"max_delivery_days" integer DEFAULT 3 NOT NULL,
	"carrier" text DEFAULT 'manual',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_rates_wilaya_code_unique" UNIQUE("wilaya_code")
);

ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_product_fk" FOREIGN KEY ("option_id","product_id") REFERENCES "public"."product_options"("id","product_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_option_value_id_product_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_variant_product_fk" FOREIGN KEY ("variant_id","product_id") REFERENCES "public"."product_variants"("id","product_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "product_variant_values" ADD CONSTRAINT "product_variant_values_value_product_fk" FOREIGN KEY ("option_value_id","product_id") REFERENCES "public"."product_option_values"("id","product_id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "product_option_values_option_id_idx" ON "product_option_values" USING btree ("option_id");
CREATE INDEX "product_option_values_product_id_idx" ON "product_option_values" USING btree ("product_id");
CREATE INDEX "product_options_product_id_idx" ON "product_options" USING btree ("product_id");
CREATE INDEX "product_variant_values_variant_id_idx" ON "product_variant_values" USING btree ("variant_id");
CREATE INDEX "product_variant_values_option_value_id_idx" ON "product_variant_values" USING btree ("option_value_id");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");
CREATE INDEX "product_variants_product_active_idx" ON "product_variants" USING btree ("product_id","is_active");

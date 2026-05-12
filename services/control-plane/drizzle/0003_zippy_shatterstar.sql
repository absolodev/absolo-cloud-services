CREATE SCHEMA "billing";
--> statement-breakpoint
CREATE SCHEMA "bindings";
--> statement-breakpoint
CREATE SCHEMA "databases";
--> statement-breakpoint
CREATE SCHEMA "enterprise";
--> statement-breakpoint
CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE SCHEMA "storage";
--> statement-breakpoint
CREATE TABLE "storage"."access_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"scope" text DEFAULT 'org' NOT NULL,
	"bucket_id" text,
	"access_key" text NOT NULL,
	"secret_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_keys_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "bindings"."bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"env_prefix" text NOT NULL,
	"auto_inject" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage"."bucket_lifecycle_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket_id" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"expire_days" integer,
	"transition_days" integer,
	"transition_class" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage"."buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text NOT NULL,
	"region" text DEFAULT 'eu-central' NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"public_read" boolean DEFAULT false NOT NULL,
	"versioning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprise"."cluster_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"msa_url" text,
	"dpa_url" text,
	"sla_target" text,
	"sla_credits_terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise"."cluster_hosts" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"fqdn" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"agent_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."credits" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"remaining_cents" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"applied_to_invoice_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "databases"."database_backups" (
	"id" text PRIMARY KEY NOT NULL,
	"database_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"size_bytes" integer,
	"location_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "databases"."database_users" (
	"id" text PRIMARY KEY NOT NULL,
	"database_id" text NOT NULL,
	"username" text NOT NULL,
	"password_enc" text,
	"scope" text DEFAULT 'full' NOT NULL,
	"bound_app_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."dunning_state" (
	"org_id" text PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise"."clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"plan_kind" text DEFAULT 'byo' NOT NULL,
	"region_proxy" text,
	"total_hosts" integer DEFAULT 0 NOT NULL,
	"compliance_tags" jsonb DEFAULT '[]' NOT NULL,
	"onboarding_status" text DEFAULT 'pending' NOT NULL,
	"contract_start" timestamp with time zone,
	"contract_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"stripe_invoice_id" text,
	"number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"pdf_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "databases"."maintenance_windows" (
	"database_id" text PRIMARY KEY NOT NULL,
	"day_of_week" integer DEFAULT 0 NOT NULL,
	"hour_utc" integer DEFAULT 4 NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "databases"."managed_databases" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text,
	"name" text NOT NULL,
	"engine" text NOT NULL,
	"version" text NOT NULL,
	"size" text DEFAULT 's' NOT NULL,
	"ha" boolean DEFAULT false NOT NULL,
	"region" text DEFAULT 'eu-central' NOT NULL,
	"storage_gb" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"endpoint_host" text,
	"endpoint_port" integer,
	"master_username" text DEFAULT 'absolo' NOT NULL,
	"master_password_enc" text,
	"k8s_namespace" text,
	"k8s_cr_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing"."meter_shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"batch_id" text NOT NULL,
	"sent_at" timestamp with time zone,
	"stripe_event_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage"."object_stats" (
	"bucket_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"bytes_stored_avg" integer DEFAULT 0 NOT NULL,
	"bytes_egress" integer DEFAULT 0 NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "object_stats_bucket_id_hour_pk" PRIMARY KEY("bucket_id","hour")
);
--> statement-breakpoint
CREATE TABLE "databases"."parameter_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"engine" text NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"stripe_pm_id" text NOT NULL,
	"brand" text,
	"last4" text,
	"exp_month" integer,
	"exp_year" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."plans" (
	"id" text PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"monthly_anchor_cents" integer DEFAULT 0 NOT NULL,
	"included_units" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "platform"."regions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"capabilities" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."stripe_webhook_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."subscription_items" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"kind" text NOT NULL,
	"stripe_price_id" text,
	"stripe_meter_id" text,
	"stripe_subscription_item_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."tax_profiles" (
	"org_id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"vat_id" text,
	"validated_at" timestamp with time zone,
	"exempt" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"kind" text NOT NULL,
	"qty" integer NOT NULL,
	"unit" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."usage_hourly" (
	"org_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"kind" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_hourly_org_id_resource_id_kind_hour_pk" PRIMARY KEY("org_id","resource_id","kind","hour")
);
--> statement-breakpoint
ALTER TABLE "storage"."access_keys" ADD CONSTRAINT "access_keys_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bindings"."bindings" ADD CONSTRAINT "bindings_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "compute"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage"."bucket_lifecycle_rules" ADD CONSTRAINT "bucket_lifecycle_rules_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise"."cluster_contracts" ADD CONSTRAINT "cluster_contracts_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "enterprise"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise"."cluster_hosts" ADD CONSTRAINT "cluster_hosts_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "enterprise"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."credits" ADD CONSTRAINT "credits_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."database_backups" ADD CONSTRAINT "database_backups_database_id_managed_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "databases"."managed_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."database_users" ADD CONSTRAINT "database_users_database_id_managed_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "databases"."managed_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."database_users" ADD CONSTRAINT "database_users_bound_app_id_apps_id_fk" FOREIGN KEY ("bound_app_id") REFERENCES "compute"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."dunning_state" ADD CONSTRAINT "dunning_state_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise"."clusters" ADD CONSTRAINT "clusters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."maintenance_windows" ADD CONSTRAINT "maintenance_windows_database_id_managed_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "databases"."managed_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."managed_databases" ADD CONSTRAINT "managed_databases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."managed_databases" ADD CONSTRAINT "managed_databases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "databases"."managed_databases" ADD CONSTRAINT "managed_databases_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage"."object_stats" ADD CONSTRAINT "object_stats_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."payment_methods" ADD CONSTRAINT "payment_methods_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "billing"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."tax_profiles" ADD CONSTRAINT "tax_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."usage_events" ADD CONSTRAINT "usage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."usage_hourly" ADD CONSTRAINT "usage_hourly_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_keys_owner_idx" ON "storage"."access_keys" USING btree ("owner_kind","owner_id");--> statement-breakpoint
CREATE INDEX "bindings_app_idx" ON "bindings"."bindings" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "bindings_resource_idx" ON "bindings"."bindings" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bindings_app_resource_unique" ON "bindings"."bindings" USING btree ("app_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "bucket_lifecycle_rules_bucket_idx" ON "storage"."bucket_lifecycle_rules" USING btree ("bucket_id");--> statement-breakpoint
CREATE INDEX "buckets_org_idx" ON "storage"."buckets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "buckets_project_idx" ON "storage"."buckets" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buckets_org_slug_unique" ON "storage"."buckets" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cluster_contracts_cluster_unique" ON "enterprise"."cluster_contracts" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "cluster_hosts_cluster_idx" ON "enterprise"."cluster_hosts" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "credits_org_idx" ON "billing"."credits" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "database_backups_db_idx" ON "databases"."database_backups" USING btree ("database_id");--> statement-breakpoint
CREATE INDEX "database_users_db_idx" ON "databases"."database_users" USING btree ("database_id");--> statement-breakpoint
CREATE INDEX "enterprise_clusters_org_idx" ON "enterprise"."clusters" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "billing"."invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "billing"."invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "managed_databases_org_idx" ON "databases"."managed_databases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "managed_databases_project_idx" ON "databases"."managed_databases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "managed_databases_status_idx" ON "databases"."managed_databases" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "meter_shipments_hour_kind_batch_idx" ON "billing"."meter_shipments" USING btree ("hour","kind","batch_id");--> statement-breakpoint
CREATE INDEX "payment_methods_org_idx" ON "billing"."payment_methods" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "regions_code_unique" ON "platform"."regions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stripe_webhook_events_type_idx" ON "billing"."stripe_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "subscription_items_sub_idx" ON "billing"."subscription_items" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "billing"."subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_unique" ON "billing"."subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "usage_events_org_resource_idx" ON "billing"."usage_events" USING btree ("org_id","resource_id");--> statement-breakpoint
CREATE INDEX "usage_events_occurred_idx" ON "billing"."usage_events" USING btree ("occurred_at");
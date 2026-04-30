CREATE SCHEMA "compute";
--> statement-breakpoint
CREATE SCHEMA "mq";
--> statement-breakpoint
CREATE TABLE "compute"."apps" (
	"id" text PRIMARY KEY NOT NULL,
	"environment_id" text NOT NULL,
	"slug" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_ref" text NOT NULL,
	"default_branch" text,
	"build_spec" jsonb,
	"runtime_spec" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "compute"."deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"version_id" text NOT NULL,
	"source_commit_sha" text,
	"build_log_url" text,
	"status" text NOT NULL,
	"traffic_pct" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mq"."outbox" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"topic" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mq"."saga_state" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"saga_type" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"context" jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compute"."sites" (
	"id" text PRIMARY KEY NOT NULL,
	"environment_id" text NOT NULL,
	"slug" text NOT NULL,
	"template_id" text NOT NULL,
	"runtime_spec" jsonb,
	"pv_size_gb" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "compute"."apps" ADD CONSTRAINT "apps_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compute"."deployments" ADD CONSTRAINT "deployments_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "compute"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compute"."sites" ADD CONSTRAINT "sites_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_apps_env_slug" ON "compute"."apps" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE INDEX "idx_deployments_app" ON "compute"."deployments" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sites_env_slug" ON "compute"."sites" USING btree ("environment_id","slug");
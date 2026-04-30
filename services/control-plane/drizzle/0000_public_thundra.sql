CREATE SCHEMA "iam";
--> statement-breakpoint
CREATE SCHEMA "projects";
--> statement-breakpoint
CREATE TABLE "projects"."config_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text,
	"key" text NOT NULL,
	"value_ciphertext" text NOT NULL,
	"value_preview" text,
	"kind" text NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"binding_id" text,
	"version_id" text NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects"."config_files" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"permissions" text DEFAULT '0600' NOT NULL,
	"content_ciphertext" text NOT NULL,
	"content_hash" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects"."config_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"content_hash" text NOT NULL,
	"change_summary" text DEFAULT '' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects"."environments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"auto_sleep_after_minutes" integer,
	"current_deployment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam"."memberships" (
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"default_region" text DEFAULT 'eu-central' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects"."projects" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"user_agent" text,
	"ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"avatar_url" text,
	"password_hash" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects"."config_entries" ADD CONSTRAINT "config_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_entries" ADD CONSTRAINT "config_entries_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_entries" ADD CONSTRAINT "config_entries_version_id_config_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "projects"."config_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_files" ADD CONSTRAINT "config_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_files" ADD CONSTRAINT "config_files_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_versions" ADD CONSTRAINT "config_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."config_versions" ADD CONSTRAINT "config_versions_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "projects"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."environments" ADD CONSTRAINT "environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "config_entries_env_key_unique" ON "projects"."config_entries" USING btree ("environment_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "config_entries_project_shared_key_unique" ON "projects"."config_entries" USING btree ("project_id","key") WHERE environment_id IS NULL;--> statement-breakpoint
CREATE INDEX "config_entries_project_idx" ON "projects"."config_entries" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "config_files_env_path_unique" ON "projects"."config_files" USING btree ("environment_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX "config_versions_env_version_unique" ON "projects"."config_versions" USING btree ("environment_id","version_number");--> statement-breakpoint
CREATE INDEX "config_versions_env_idx" ON "projects"."config_versions" USING btree ("environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "environments_project_slug_unique" ON "projects"."environments" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "environments_project_idx" ON "projects"."environments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "iam"."memberships" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "iam"."organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_org_slug_unique" ON "projects"."projects" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects"."projects" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "iam"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "iam"."users" USING btree ("email");
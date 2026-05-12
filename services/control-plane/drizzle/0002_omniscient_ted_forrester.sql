CREATE SCHEMA "domains";
--> statement-breakpoint
CREATE TABLE "domains"."custom_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_name" text NOT NULL,
	"app_id" text,
	"org_id" text NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_domain_name_unique" UNIQUE("domain_name")
);
--> statement-breakpoint
CREATE TABLE "domains"."subdomains" (
	"id" text PRIMARY KEY NOT NULL,
	"full_host" text NOT NULL,
	"app_id" text,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subdomains_full_host_unique" UNIQUE("full_host")
);
--> statement-breakpoint
ALTER TABLE "iam"."organizations" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "iam"."organizations" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "iam"."organizations" ADD COLUMN "spend_cap_limit_cents" integer DEFAULT 10000;--> statement-breakpoint
ALTER TABLE "domains"."custom_domains" ADD CONSTRAINT "custom_domains_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "compute"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains"."custom_domains" ADD CONSTRAINT "custom_domains_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains"."subdomains" ADD CONSTRAINT "subdomains_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "compute"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains"."subdomains" ADD CONSTRAINT "subdomains_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "iam"."organizations"("id") ON DELETE cascade ON UPDATE no action;
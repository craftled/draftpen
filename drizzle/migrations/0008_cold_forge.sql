CREATE TABLE IF NOT EXISTS "extracted_page" (
	"id" text PRIMARY KEY NOT NULL,
	"extraction_id" text NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"meta_description" text,
	"h1" text,
	"content" text NOT NULL,
	"word_count" integer NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"intro_word_count" integer NOT NULL,
	"flesch_score" real NOT NULL,
	"headings" json NOT NULL,
	"keyword_frequencies" json,
	"entities" json,
	"semantic_keywords" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN "model" text;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN "input_tokens" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN "output_tokens" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN "total_tokens" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD COLUMN "completion_time" real;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD COLUMN "recurringIntervalCount" integer DEFAULT 1 NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD COLUMN "trialStart" timestamp;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD COLUMN "trialEnd" timestamp;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_page" ADD CONSTRAINT "extracted_page_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page_analysis" ADD CONSTRAINT "page_analysis_page_id_extracted_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."extracted_page"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" DROP COLUMN "discountId";
EXCEPTION
 WHEN undefined_column THEN null;
END $$;
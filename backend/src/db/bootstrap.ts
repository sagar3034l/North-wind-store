import { sql } from "drizzle-orm";
import { db } from "./index.js";

export async function ensureCheckoutSessionsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "checkout_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "polar_checkout_id" text,
      "lines" jsonb NOT NULL,
      "total_cents" integer NOT NULL,
      "currency" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "checkout_sessions_polar_checkout_id_unique" UNIQUE("polar_checkout_id"),
      CONSTRAINT "checkout_sessions_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
    );
  `);
}

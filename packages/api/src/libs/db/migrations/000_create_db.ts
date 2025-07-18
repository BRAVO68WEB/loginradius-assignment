import { Kysely } from "kysely";

import { type Database } from "@/types/db";

export async function up(db: Kysely<Database>): Promise<void> {
	await db.schema
		.createTable("users")
		.addColumn("id", "text", col => col.primaryKey().notNull())
		.addColumn("email", "text", col => col.notNull())
        .addColumn("username", "text", col => col.notNull())
        .addColumn("full_name", "text")
        .addColumn("profile_picture_url", "text")
        .addColumn("role", "text", col => col.notNull().defaultTo("user"))
        .addColumn("hash", "text", col => col.notNull())
        .addColumn("salt", "text", col => col.notNull())
        .addColumn("is_active", "boolean", col => col.notNull().defaultTo(false))
        .addColumn("is_deleted", "boolean", col => col.notNull().defaultTo(false))
        .addColumn("last_login", "timestamptz")
		.addColumn("created_at", "timestamptz", col => col.notNull())
		.addColumn("updated_at", "timestamptz", col => col.notNull())
		.execute();

    await db.schema
        .createIndex("users_email_idx")
        .on("users")
        .column("email")
        .execute();

    await db.schema
        .createIndex("users_username_idx")
        .on("users")
        .column("username")
        .execute();

    await db.schema
        .createTable("sessions")
        .addColumn("id", "text", col => col.primaryKey().notNull())
        .addColumn("user_id", "text", col => col.notNull())
        .addColumn("claim_token", "text", col => col.notNull())
        .addColumn("last_claimed_at", "timestamptz")
        .addColumn("expires_at", "timestamptz", col => col.notNull())
        .addColumn("is_active", "boolean", col => col.notNull().defaultTo(false))
        .addColumn("created_at", "timestamptz", col => col.notNull())
        .addColumn("updated_at", "timestamptz", col => col.notNull())
        .execute();

    await db.schema
        .createIndex("sessions_claim_token_idx")
        .on("sessions")
        .column("claim_token")
        .execute();

    await db.schema
        .createTable("anomalies")
        .addColumn("id", "text", col => col.primaryKey().notNull())
        .addColumn("anomaly_type", "text", col => col.notNull())
        .addColumn("user_id", "text")
        .addColumn("ip_address", "text")
        .addColumn("created_at", "timestamptz", col => col.notNull())
        .addColumn("updated_at", "timestamptz", col => col.notNull())
        .execute();

    await db.schema
        .createIndex("anomalies_type_idx")
        .on("anomalies")
        .column("anomaly_type")
        .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
	await db.schema.dropTable("users").execute();
    await db.schema.dropTable("sessions").execute();
    await db.schema.dropTable("anomalies").execute();
}
import postgres from "postgres";

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getDatabaseUrl(): string {
  return (
    readEnv("POSTGRES_URL") ||
    readEnv("POSTGRES_PRISMA_URL") ||
    readEnv("DATABASE_URL") ||
    readEnv("POSTGRES_URL_NON_POOLING")
  );
}

export function databaseConfigured(): boolean {
  return getDatabaseUrl().length > 0;
}

function shouldUseSsl(url: string): boolean {
  return !(url.includes("localhost") || url.includes("127.0.0.1"));
}

type SqlClient = ReturnType<typeof postgres>;

let client: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;
let purchasedSchemaReady: Promise<void> | null = null;

export function getSql(): SqlClient {
  if (client) return client;
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("POSTGRES_URL (or DATABASE_URL) is not configured");
  }
  client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: shouldUseSsl(url) ? "require" : false,
  });
  return client;
}

export async function ensureTesterAccessSchema(sql: SqlClient = getSql()): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tester_access_codes (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL UNIQUE,
        code_prefix TEXT NOT NULL,
        label TEXT NOT NULL,
        email_restriction TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        maximum_activations INTEGER NOT NULL DEFAULT 1,
        activation_count INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        revoked_at TIMESTAMPTZ,
        last_activated_at TIMESTAMPTZ,
        notes TEXT
      )
    `.then(() => undefined);
  }
  await schemaReady;
}

export async function ensurePurchasedLicenceSchema(sql: SqlClient = getSql()): Promise<void> {
  if (!purchasedSchemaReady) {
    purchasedSchemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS purchased_licences (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          provider_purchase_id TEXT NOT NULL,
          provider_customer_id TEXT,
          provider_membership_id TEXT,
          product_id TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          licence_hash TEXT NOT NULL,
          licence_prefix TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status TEXT NOT NULL,
          revoked_at TIMESTAMPTZ,
          last_activated_at TIMESTAMPTZ,
          metadata JSONB,
          CONSTRAINT purchased_licences_provider_purchase_unique UNIQUE (provider, provider_purchase_id),
          CONSTRAINT purchased_licences_licence_hash_unique UNIQUE (licence_hash)
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS purchased_licences_provider_purchase_idx
        ON purchased_licences (provider, provider_purchase_id)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS purchased_licences_licence_hash_idx
        ON purchased_licences (licence_hash)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS webhook_events (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          event_type TEXT NOT NULL,
          provider_purchase_id TEXT,
          processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          outcome TEXT NOT NULL
        )
      `;
    })();
  }
  await purchasedSchemaReady;
}

import { testerAdminConfigured } from "../lib/auth/tester-codes";
import { PostgresPurchasedLicenceStore } from "../lib/db/purchased-licence-store";
import { databaseConfigured } from "../lib/db/postgres";
import { loadLocalEnv } from "./load-local-env";
import { hasFlag, prompt, readArg } from "./tester-cli";

export { hasFlag, prompt, readArg };

export function requirePurchaseAdmin(): PostgresPurchasedLicenceStore {
  loadLocalEnv();
  if (!testerAdminConfigured()) {
    console.error("Set PROPERTYIQ_TESTER_ADMIN_SECRET in .env.local (16+ characters).");
    process.exit(1);
  }
  if (!databaseConfigured()) {
    console.error("Set POSTGRES_URL or DATABASE_URL from the Vercel Postgres integration.");
    process.exit(1);
  }
  return new PostgresPurchasedLicenceStore();
}

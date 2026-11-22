import { publicTesterCode } from "../lib/auth/tester-codes";
import { formatExpiry, requireTesterAdmin } from "./tester-cli";

async function main() {
  const store = requireTesterAdmin();
  const records = await store.list();
  if (records.length === 0) {
    console.log("No tester codes.");
    return;
  }

  for (const record of records) {
    const view = publicTesterCode(record);
    console.log("----------------------------------------");
    console.log(`ID: ${view.id}`);
    console.log(`Label: ${view.label}`);
    console.log(`Code: ${view.codePrefix}`);
    console.log(`Expires: ${formatExpiry(record.expiresAt)}`);
    console.log(`Activations: ${view.activationCount} / ${view.maximumActivations}`);
    console.log(`Active: ${view.active ? "yes" : "no"}`);
    if (view.emailMask) console.log(`Email restriction: ${view.emailMask}`);
    if (view.notes) console.log(`Notes: ${view.notes}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to list tester codes.");
  process.exit(1);
});

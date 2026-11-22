import { publicPurchasedLicence } from "../lib/auth/purchased-licences";
import { requirePurchaseAdmin } from "./whop-cli";

async function main() {
  const store = requirePurchaseAdmin();
  const records = await store.list("whop");
  if (records.length === 0) {
    console.log("No Whop licence records.");
    return;
  }

  for (const record of records) {
    const view = publicPurchasedLicence(record);
    console.log("----------------------------------------");
    console.log(`ID: ${view.id}`);
    console.log(`Payment: ${view.providerPurchaseId}`);
    console.log(`Product: ${view.productId}`);
    console.log(`Email: ${view.customerEmail}`);
    console.log(`Licence: ${view.licencePrefix}`);
    console.log(`Status: ${view.status}`);
    console.log(`Created: ${new Date(view.createdAt).toISOString()}`);
    if (view.revokedAt) console.log(`Revoked: ${new Date(view.revokedAt).toISOString()}`);
    if (view.lastActivatedAt) console.log(`Last activated: ${new Date(view.lastActivatedAt).toISOString()}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to list Whop licences.");
  process.exit(1);
});

import {
  generateWhopLicenceKey,
  hashPurchasedLicenceKey,
  publicPurchasedLicence,
} from "../lib/auth/purchased-licences";
import { normalizeEmail } from "../lib/auth/session";
import { hasFlag, readArg, requirePurchaseAdmin } from "./whop-cli";

function usage(): never {
  console.error(`Usage:
  npm run whop:inspect -- --payment pay_xxx
  npm run whop:inspect -- --id <licence-id>
  npm run whop:inspect -- --email buyer@example.com
  npm run whop:inspect -- --tail ABCD
  npm run whop:inspect -- --payment pay_xxx --reveal
`);
  process.exit(1);
}

async function main() {
  const store = requirePurchaseAdmin();
  const payment = readArg("payment");
  const id = readArg("id");
  const email = readArg("email");
  const tail = readArg("tail");
  const reveal = hasFlag("reveal");

  if (!payment && !id && !email && !tail) usage();

  const records = await store.list("whop");
  const matches = records.filter((record) => {
    if (id && record.id !== id) return false;
    if (payment && record.providerPurchaseId !== payment.trim()) return false;
    if (email && normalizeEmail(record.customerEmail) !== normalizeEmail(email)) return false;
    if (tail && !record.licencePrefix.toUpperCase().endsWith(tail.trim().toUpperCase())) return false;
    return true;
  });

  if (matches.length === 0) {
    console.error("No Whop licence matched.");
    process.exit(1);
  }

  for (const record of matches) {
    const view = publicPurchasedLicence(record);
    console.log("----------------------------------------");
    console.log(`ID: ${view.id}`);
    console.log(`Payment: ${record.providerPurchaseId}`);
    console.log(`Product: ${view.productId}`);
    console.log(`Email: ${view.customerEmail}`);
    console.log(`Licence: ${view.licencePrefix}`);
    console.log(`Status: ${view.status}`);
    if (reveal) {
      const reconstructed = generateWhopLicenceKey(record.providerPurchaseId);
      if (hashPurchasedLicenceKey(reconstructed) === record.licenceHash) {
        console.log("Licence key:");
        console.log(reconstructed);
      } else {
        console.log("Licence key: not reconstructable with the current session secret.");
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to inspect Whop licence.");
  process.exit(1);
});

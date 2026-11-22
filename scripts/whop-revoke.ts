import { publicPurchasedLicence } from "../lib/auth/purchased-licences";
import { hasFlag, prompt, readArg, requirePurchaseAdmin } from "./whop-cli";

function usage(): never {
  console.error(`Usage:
  npm run whop:revoke -- --payment pay_xxx
  npm run whop:revoke -- --id <licence-id>
  npm run whop:revoke -- --payment pay_xxx --enable
`);
  process.exit(1);
}

async function main() {
  const store = requirePurchaseAdmin();
  const payment = readArg("payment") ?? (await prompt("Whop payment ID: "));
  const id = readArg("id");
  const enable = hasFlag("enable");
  const now = Date.now();

  if (!payment && !id) usage();

  const record = id
    ? (await store.list("whop")).find((item) => item.id === id) ?? null
    : await store.findByPurchase("whop", payment.trim());

  if (!record) {
    console.error("No Whop licence matched.");
    process.exit(1);
  }

  const updated = enable
    ? await store.setStatus(record.id, "active", now)
    : await store.revokeByPurchase(record.provider, record.providerPurchaseId, now);

  if (!updated) {
    console.error("Failed to update Whop licence.");
    process.exit(1);
  }

  const view = publicPurchasedLicence(updated);
  console.log(enable ? "Whop licence re-enabled" : "Whop licence revoked");
  console.log(`ID: ${view.id}`);
  console.log(`Payment: ${view.providerPurchaseId}`);
  console.log(`Licence: ${view.licencePrefix}`);
  console.log(`Status: ${view.status}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to update Whop licence.");
  process.exit(1);
});

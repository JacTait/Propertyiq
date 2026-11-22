import { publicPurchasedLicence } from "../lib/auth/purchased-licences";
import { reconcileWhopPayment } from "../lib/auth/whop";
import { prompt, readArg, requirePurchaseAdmin } from "./whop-cli";

function usage(): never {
  console.error(`Usage:
  npm run whop:reconcile -- --payment pay_xxx
`);
  process.exit(1);
}

async function main() {
  const store = requirePurchaseAdmin();
  const payment = readArg("payment") ?? (await prompt("Whop payment ID: "));
  if (!payment) usage();

  const result = await reconcileWhopPayment(payment, { store });
  if (!result.ok) {
    console.error(`Reconcile failed: ${result.reason}`);
    process.exit(1);
  }

  const view = publicPurchasedLicence(result.record);
  console.log(result.outcome === "created" ? "Whop licence issued" : "Whop licence already existed");
  console.log(`ID: ${view.id}`);
  console.log(`Payment: ${view.providerPurchaseId}`);
  console.log(`Licence: ${view.licencePrefix}`);
  console.log(`Status: ${view.status}`);
  console.log("Use npm run whop:inspect -- --payment <id> --reveal to reconstruct the key.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to reconcile Whop payment.");
  process.exit(1);
});

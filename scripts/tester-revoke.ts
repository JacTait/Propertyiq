import { publicTesterCode } from "../lib/auth/tester-codes";
import { prompt, readArg, requireTesterAdmin } from "./tester-cli";

function usage(): never {
  console.error(`Usage:
  npm run tester:revoke -- --id <tester-code-id>
`);
  process.exit(1);
}

async function main() {
  const store = requireTesterAdmin();
  const id = readArg("id") ?? (await prompt("Tester code ID: "));
  if (!id) usage();

  const record = await store.revoke(id, Date.now());
  if (!record) {
    console.error("No tester code matched that ID.");
    process.exit(1);
  }

  const view = publicTesterCode(record);
  console.log("Tester code revoked");
  console.log(`ID: ${view.id}`);
  console.log(`Label: ${view.label}`);
  console.log(`Code: ${view.codePrefix}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to revoke tester code.");
  process.exit(1);
});

import {
  DEFAULT_TESTER_MAX_ACTIVATIONS,
  DEFAULT_TESTER_TTL_MS,
  issueTesterCode,
} from "../lib/auth/tester-codes";
import { copyToClipboard, formatExpiry, prompt, readArg, requireTesterAdmin } from "./tester-cli";

function usage(): never {
  console.error(`Usage:
  npm run tester:create -- --label "Reddit AppScout Reviewer" [--days 7] [--max 1] [--email reviewer@example.com] [--notes "internal"]
`);
  process.exit(1);
}

async function main() {
  const store = requireTesterAdmin();
  const label = readArg("label") ?? (await prompt("Label: "));
  if (!label) usage();

  const daysRaw = readArg("days");
  const expiresRaw = readArg("expires");
  const maxRaw = readArg("max");
  const email = readArg("email") ?? (await prompt("Email restriction (optional): "));
  const notes = readArg("notes") ?? (await prompt("Notes (optional): "));
  const now = Date.now();

  let expiresAt = now + DEFAULT_TESTER_TTL_MS;
  if (expiresRaw) {
    const parsed = Date.parse(expiresRaw);
    if (!Number.isFinite(parsed)) {
      console.error("Invalid --expires date. Use YYYY-MM-DD.");
      process.exit(1);
    }
    expiresAt = parsed;
  } else if (daysRaw) {
    const days = Number.parseInt(daysRaw, 10);
    if (!Number.isFinite(days) || days < 1) {
      console.error("--days must be a positive integer.");
      process.exit(1);
    }
    expiresAt = now + days * 24 * 60 * 60 * 1000;
  } else {
    const daysAnswer = await prompt("Expiry in days [7]: ", "7");
    const days = Number.parseInt(daysAnswer, 10);
    if (Number.isFinite(days) && days >= 1) {
      expiresAt = now + days * 24 * 60 * 60 * 1000;
    }
  }

  const maximumActivations = maxRaw
    ? Number.parseInt(maxRaw, 10)
    : Number.parseInt(await prompt(`Maximum activations [${DEFAULT_TESTER_MAX_ACTIVATIONS}]: `, String(DEFAULT_TESTER_MAX_ACTIVATIONS)), 10);

  const issued = await issueTesterCode(store, {
    label,
    expiresAt,
    maximumActivations: Number.isFinite(maximumActivations) ? maximumActivations : DEFAULT_TESTER_MAX_ACTIVATIONS,
    emailRestriction: email || null,
    notes: notes || null,
    now,
  });

  const copied = await copyToClipboard(issued.code);

  console.log("Tester code created");
  console.log("Label:");
  console.log(issued.record.label);
  console.log("Code:");
  console.log(issued.code);
  console.log("Expires:");
  console.log(formatExpiry(issued.record.expiresAt));
  console.log("Maximum activations:");
  console.log(String(issued.record.maximumActivations));
  console.log(copied ? "Copied to clipboard." : "Copy this code now. It will not be shown again.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to create tester code.");
  process.exit(1);
});

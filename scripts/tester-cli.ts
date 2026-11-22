import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { testerAdminConfigured } from "../lib/auth/tester-codes";
import { databaseConfigured } from "../lib/db/postgres";
import { PostgresTesterStore } from "../lib/db/tester-store";
import { loadLocalEnv } from "./load-local-env";

export function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export async function prompt(question: string, fallback = ""): Promise<string> {
  if (!input.isTTY) return fallback;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

export function formatExpiry(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("clip");
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("clip failed"))));
        child.stdin.write(text);
        child.stdin.end();
      });
      return true;
    }
    if (process.platform === "darwin") {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("pbcopy");
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("pbcopy failed"))));
        child.stdin.write(text);
        child.stdin.end();
      });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function requireTesterAdmin(): PostgresTesterStore {
  loadLocalEnv();
  if (!testerAdminConfigured()) {
    console.error("Set PROPERTYIQ_TESTER_ADMIN_SECRET in .env.local (16+ characters).");
    process.exit(1);
  }
  if (!databaseConfigured()) {
    console.error("Set POSTGRES_URL or DATABASE_URL from the Vercel Postgres integration.");
    process.exit(1);
  }
  return new PostgresTesterStore();
}

import { timingSafeEqual } from "node:crypto";
import {
  type TesterCodeStore,
  getTesterAdminSecret,
  issueTesterCode,
  publicTesterCode,
  testerAdminConfigured,
  type IssueTesterCodeInput,
} from "@/lib/auth/tester-codes";

export function readTesterAdminSecretFromRequest(request: Request): string {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return request.headers.get("x-propertyiq-tester-admin")?.trim() ?? "";
}

export function authorizeTesterAdmin(request: Request): "ok" | "misconfigured" | "unauthorized" {
  if (!testerAdminConfigured()) return "misconfigured";
  const provided = readTesterAdminSecretFromRequest(request);
  const expected = getTesterAdminSecret();
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return "unauthorized";
  return timingSafeEqual(left, right) ? "ok" : "unauthorized";
}

export async function createTesterCodeForAdmin(store: TesterCodeStore, input: IssueTesterCodeInput) {
  const issued = await issueTesterCode(store, input);
  return {
    record: publicTesterCode(issued.record),
    code: issued.code,
  };
}

export async function listTesterCodesForAdmin(store: TesterCodeStore) {
  const records = await store.list();
  return records.map(publicTesterCode);
}

export async function revokeTesterCodeForAdmin(store: TesterCodeStore, id: string, now = Date.now()) {
  return store.revoke(id.trim(), now);
}

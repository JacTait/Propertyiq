"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AccessSessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/access/revalidate", { method: "POST" })
      .then(async (response) => {
        if (cancelled || response.ok) return;
        const payload: unknown = await response.json().catch(() => null);
        const error =
          isRecord(payload) && typeof payload.error === "string" ? payload.error : "required";
        const reason = error === "disabled" || error === "expired" ? error : "required";
        router.replace(`/access?reason=${reason}`);
        router.refresh();
      })
      .catch(() => {
        /* Keep the existing session if refresh cannot reach the server. */
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getWhopAccountId, trackWhopPageView } from "@/lib/analytics/whop-pixel";

export function WhopPixelRouteTracker() {
  const accountId = getWhopAccountId();
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    if (trackedPath.current === null) {
      trackedPath.current = pathname;
      return;
    }
    if (trackedPath.current === pathname) return;
    trackedPath.current = pathname;
    trackWhopPageView();
  }, [accountId, pathname]);

  return null;
}

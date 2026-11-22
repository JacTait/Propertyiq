import Script from "next/script";
import {
  buildWhopPixelSnippet,
  getWhopAccountId,
  WHOP_PIXEL_SCRIPT_ID,
} from "@/lib/analytics/whop-pixel";
import { WhopPixelRouteTracker } from "@/components/analytics/whop-pixel-route-tracker";

export function WhopPixel() {
  const accountId = getWhopAccountId();
  if (!accountId) return null;

  return (
    <>
      <Script id={WHOP_PIXEL_SCRIPT_ID} strategy="afterInteractive">
        {buildWhopPixelSnippet(accountId)}
      </Script>
      <WhopPixelRouteTracker />
    </>
  );
}

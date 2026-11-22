import {
  buildWhopPixelSnippet,
  getWhopAccountId,
  WHOP_PIXEL_SCRIPT_ID,
} from "@/lib/analytics/whop-pixel";

export function WhopPixel() {
  const accountId = getWhopAccountId();
  if (!accountId) return null;

  return (
    <script
      id={WHOP_PIXEL_SCRIPT_ID}
      dangerouslySetInnerHTML={{ __html: buildWhopPixelSnippet(accountId) }}
    />
  );
}

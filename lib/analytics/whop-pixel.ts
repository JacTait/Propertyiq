type EnvSource = Record<string, string | undefined>;

export const WHOP_PIXEL_ORIGIN = "https://t.whop.tw";
export const WHOP_PIXEL_SCRIPT_SRC = `${WHOP_PIXEL_ORIGIN}/s.js`;
export const WHOP_PIXEL_SCRIPT_ID = "whop-pixel";

/**
 * Official Whop Pixel bootstrap from https://docs.whop.com/developer/ads/pixel
 * Loads https://t.whop.tw/s.js once (`if (window.whop) return`).
 */
export const WHOP_PIXEL_BOOTSTRAP =
  '!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");';

export type WhopPixelClient = {
  track: (...args: unknown[]) => void;
  setScope: (...args: string[]) => void;
};

declare global {
  interface Window {
    whop?: WhopPixelClient;
  }
}

function readValue(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isWhopAccountId(value: string): boolean {
  return /^biz_[A-Za-z0-9]+$/.test(value);
}

export function getWhopAccountId(source?: EnvSource): string {
  const raw = source
    ? readValue(source.NEXT_PUBLIC_WHOP_ACCOUNT_ID)
    : readValue(process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID);
  return isWhopAccountId(raw) ? raw : "";
}

export function buildWhopPixelSnippet(accountId: string): string {
  if (!isWhopAccountId(accountId)) return "";
  return `${WHOP_PIXEL_BOOTSTRAP}\nwhop.setScope(${JSON.stringify(accountId)});\nwhop.track("page");`;
}

export function trackWhopPageView(): boolean {
  const w = (globalThis as { window?: Window }).window;
  if (!w || typeof w.whop?.track !== "function") return false;
  w.whop.track("page");
  return true;
}

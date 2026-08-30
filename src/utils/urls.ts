import { looksLike } from "./similarity";

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>()]+|(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[^\s<>()]+/gi;

const MARKDOWN_LINK_RE = /\[[^\]]*]\(\s*<?(https?:\/\/[^)\s>]+)>?\s*\)/gi;

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export const DEFAULT_SHORTENERS = [
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "rb.gy",
  "shorturl.at",
  "s.id",
  "tiny.cc",
  "clck.ru",
  "adf.ly",
];

export const OFFICIAL_BRANDS: Record<string, string[]> = {
  discord: ["discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media"],
  steam: ["steampowered.com", "steamcommunity.com", "steamgames.com"],
  github: ["github.com", "githubusercontent.com"],
  google: ["google.com", "youtube.com", "youtu.be"],
  twitter: ["twitter.com", "x.com"],
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  paypal: ["paypal.com", "paypal.me"],
  roblox: ["roblox.com"],
};

export const DEFAULT_PHISHING_KEYWORDS = [
  "free nitro",
  "nitro free",
  "nitro gratis",
  "steam gift",
  "steamcommunity",
  "airdrop",
  "wallet connect",
  "claim reward",
  "claim nitro",
  "reclama nitro",
  "regalo nitro",
  "discord gift",
  "login to claim",
  "verify your account",
  "verifica tu cuenta",
  "authorize app",
  "oauth",
];

export interface ExtractedUrl {
  raw: string;
  href: string;
  hostname: string;
  isInvite: boolean;
  isIp: boolean;
  isPunycode: boolean;
}

function sanitizeRaw(raw: string): string {
  return raw.replace(/[.,)!?;:'"]+$/g, "");
}

function toHref(raw: string): string {
  const clean = sanitizeRaw(raw);
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^discord\.(gg|com|app)/i.test(clean)) return `https://${clean}`;
  return `https://${clean}`;
}

export function extractUrls(text: string): ExtractedUrl[] {
  const found = new Map<string, ExtractedUrl>();

  const add = (raw: string): void => {
    const href = toHref(raw);
    try {
      const url = new URL(href);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      const key = href.toLowerCase();
      if (found.has(key)) return;
      found.set(key, {
        raw: sanitizeRaw(raw),
        href,
        hostname,
        isInvite: isDiscordInvite(hostname, url.pathname),
        isIp: IPV4_RE.test(hostname),
        isPunycode: hostname.includes("xn--"),
      });
    } catch {
      // URL malformada: se ignora.
    }
  };

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    add(match[1]);
  }
  for (const match of text.matchAll(URL_RE)) {
    add(match[0]);
  }

  return [...found.values()];
}

export function isDiscordInvite(hostname: string, pathname: string): boolean {
  if (hostname === "discord.gg") return true;
  return (
    (hostname === "discord.com" || hostname === "discordapp.com") &&
    pathname.toLowerCase().startsWith("/invite/")
  );
}

export function hostMatchesList(hostname: string, list: string[]): boolean {
  const normalized = hostname.toLowerCase();
  return list.some((entry) => {
    const item = entry.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return normalized === item || normalized.endsWith(`.${item}`);
  });
}

export function isShortener(hostname: string, extra: string[] = []): boolean {
  return hostMatchesList(hostname, [...DEFAULT_SHORTENERS, ...extra]);
}

export function brandLookalike(hostname: string): string | null {
  const labels = hostname.split(".");
  const sld = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  const compact = sld.replace(/[^a-z0-9]/g, "");

  for (const [brand, official] of Object.entries(OFFICIAL_BRANDS)) {
    if (hostMatchesList(hostname, official)) continue;

    const brandDistance = brand.length <= 5 ? 1 : 2;
    if (looksLike(compact, brand, brandDistance)) {
      return brand;
    }

    for (const domain of official) {
      const officialSld = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
      const maxDistance = officialSld.length >= 10 ? 3 : officialSld.length >= 7 ? 2 : 1;
      if (looksLike(compact, officialSld, maxDistance)) {
        return brand;
      }
    }
  }
  return null;
}

export function messageHasPhishingKeywords(text: string, extra: string[] = []): string | null {
  const haystack = text.toLowerCase().normalize("NFKD");
  for (const keyword of [...DEFAULT_PHISHING_KEYWORDS, ...extra]) {
    if (haystack.includes(keyword.toLowerCase())) return keyword;
  }
  return null;
}

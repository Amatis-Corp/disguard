import type {
  DeepPartial,
  PresetName,
  ResolvedConfig,
} from "./types";

const BASE: ResolvedConfig = {
  enabled: true,
  dryRun: false,
  ignoreBots: true,
  ignoreWebhooks: true,
  ignoreOwner: true,
  ignoreAdministrators: true,
  ignored: {
    users: [],
    roles: [],
    channels: [],
    categories: [],
    guilds: [],
  },
  flood: {
    enabled: true,
    maxMessages: 5,
    windowMs: 4000,
    severity: "medium",
  },
  duplicates: {
    enabled: true,
    maxRepeats: 3,
    windowMs: 12_000,
    similarity: 0.9,
    severity: "medium",
  },
  links: {
    enabled: true,
    blockInvites: false,
    blockShorteners: true,
    blockIpLinks: true,
    blockPunycode: true,
    blockBrandLookalikes: true,
    detectPhishingKeywords: true,
    allowList: [
      "discord.com",
      "discord.gg",
      "discordapp.com",
      "discordapp.net",
      "discord.media",
      "cdn.discordapp.com",
      "media.discordapp.net",
      "youtube.com",
      "youtu.be",
      "twitch.tv",
      "github.com",
      "gitlab.com",
      "google.com",
      "wikipedia.org",
      "spotify.com",
      "open.spotify.com",
    ],
    blockList: [],
    suspiciousTlds: [],
    customPatterns: [],
    extraPhishingKeywords: [],
    severity: "high",
  },
  images: {
    enabled: true,
    maxRepeats: 3,
    windowMs: 20_000,
    hashMode: "meta",
    maxDownloadBytes: 2 * 1024 * 1024,
    includeStickers: true,
    includeEmbeds: true,
    crossUserThreshold: 0,
    severity: "medium",
  },
  mentions: {
    enabled: true,
    maxMentions: 6,
    blockEveryone: true,
    blockHere: true,
    severity: "high",
  },
  caps: {
    enabled: true,
    minLength: 16,
    maxPercent: 75,
    severity: "low",
  },
  emojis: {
    enabled: true,
    maxEmojis: 12,
    maxStickers: 3,
    severity: "low",
  },
  punishment: {
    deleteMessage: true,
    warnUser: true,
    dmUser: false,
    warnMessage:
      "{user}, tu mensaje se ha bloqueado: {reason}. Strikes: {strikes}.",
    timeout: {
      enabled: true,
      durationMs: 60_000,
      minStrikes: 2,
    },
    kick: {
      enabled: false,
      minStrikes: 5,
    },
    ban: {
      enabled: false,
      minStrikes: 8,
    },
    escalate: true,
    logChannelId: null,
    strikeDecayMs: 15 * 60_000,
  },
  checkEdits: true,
  cleanupIntervalMs: 60_000,
};

const PRESET_OVERRIDES: Record<PresetName, DeepPartial<ResolvedConfig>> = {
  lenient: {
    flood: { maxMessages: 8, windowMs: 4000 },
    duplicates: { maxRepeats: 4, similarity: 0.95 },
    images: { maxRepeats: 4 },
    mentions: { maxMentions: 10, blockEveryone: true },
    caps: { enabled: false },
    emojis: { maxEmojis: 20 },
    links: {
      blockInvites: false,
      blockShorteners: false,
    },
    punishment: {
      timeout: { enabled: false, durationMs: 30_000, minStrikes: 3 },
    },
  },
  balanced: {},
  strict: {
    flood: { maxMessages: 3, windowMs: 4000, severity: "high" },
    duplicates: { maxRepeats: 2, similarity: 0.85, severity: "high" },
    images: { maxRepeats: 2, crossUserThreshold: 4, severity: "high" },
    mentions: { maxMentions: 3 },
    caps: { minLength: 10, maxPercent: 65 },
    emojis: { maxEmojis: 8, maxStickers: 2 },
    links: {
      blockInvites: true,
      blockShorteners: true,
      severity: "critical",
    },
    punishment: {
      timeout: { enabled: true, durationMs: 5 * 60_000, minStrikes: 1 },
      kick: { enabled: false, minStrikes: 4 },
    },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeDeep<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return structuredClone(base);

  const output = structuredClone(base) as T;

  for (const key of Object.keys(override) as Array<keyof T>) {
    const incoming = override[key];
    if (incoming === undefined) continue;

    const current = output[key];
    if (Array.isArray(incoming)) {
      (output as Record<string, unknown>)[key as string] = [...incoming];
    } else if (isPlainObject(incoming) && isPlainObject(current)) {
      (output as Record<string, unknown>)[key as string] = mergeDeep(
        current,
        incoming as DeepPartial<typeof current>,
      );
    } else {
      (output as Record<string, unknown>)[key as string] = incoming;
    }
  }

  return output;
}

export function resolveConfig(
  preset: PresetName | undefined,
  options: DeepPartial<ResolvedConfig> = {},
): ResolvedConfig {
  const withPreset = mergeDeep(BASE, preset ? PRESET_OVERRIDES[preset] : undefined);
  return mergeDeep(withPreset, options);
}

export const DEFAULT_CONFIG = BASE;

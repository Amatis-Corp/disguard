import type {
  DeepPartial,
  PresetName,
  ResolvedConfig,
} from "./types";

const BASE: ResolvedConfig = {
  enabled: true,
  dryRun: false,
  locale: "en",
  ignoreBots: true,
  ignoreWebhooks: true,
  ignoreOwner: true,
  ignoreAdministrators: true,
  ignorePermissions: [],
  ignored: {
    users: [],
    roles: [],
    channels: [],
    categories: [],
    guilds: [],
    prefixes: [],
  },
  flood: {
    enabled: true,
    maxMessages: 5,
    windowMs: 4000,
    sameChannelOnly: false,
    severity: "medium",
  },
  duplicates: {
    enabled: true,
    maxRepeats: 3,
    windowMs: 12_000,
    similarity: 0.9,
    sameChannelOnly: false,
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
    maxLinks: 0,
    scanEmbeds: true,
    blockOauth: true,
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
    skipContentTypes: [],
    maxAttachments: 0,
    severity: "medium",
  },
  mentions: {
    enabled: true,
    maxMentions: 6,
    blockEveryone: true,
    blockHere: true,
    maxRepeatsOfSame: 0,
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
  files: {
    enabled: true,
    blockedExtensions: [
      "exe",
      "bat",
      "cmd",
      "com",
      "scr",
      "dll",
      "msi",
      "vbs",
      "ps1",
      "jar",
      "apk",
    ],
    maxBytes: 0,
    severity: "critical",
  },
  zalgo: {
    enabled: true,
    maxCombining: 20,
    severity: "medium",
  },
  newlines: {
    enabled: true,
    maxNewlines: 15,
    severity: "low",
  },
  accounts: {
    enabled: false,
    minAgeDays: 3,
    blockDefaultAvatar: false,
    minGuildAgeDays: 0,
    severity: "medium",
  },
  length: {
    enabled: false,
    maxCharacters: 1000,
    severity: "low",
  },
  words: {
    enabled: false,
    list: [],
    regex: [],
    ignoreCase: true,
    matchWholeWord: true,
    severity: "high",
  },
  hop: {
    enabled: true,
    maxChannels: 5,
    windowMs: 8_000,
    severity: "high",
  },
  punctuation: {
    enabled: true,
    maxRepeated: 10,
    severity: "low",
  },
  spoilers: {
    enabled: true,
    maxSpoilers: 8,
    severity: "low",
  },
  ghostPing: {
    enabled: false,
    minMentions: 1,
    maxAgeMs: 15_000,
    severity: "high",
  },
  punishment: {
    deleteMessage: true,
    warnUser: true,
    dmUser: false,
    warnMessage: "",
    timeout: {
      enabled: true,
      durationMs: 60_000,
      minStrikes: 2,
      scale: "none",
      maxDurationMs: 28 * 24 * 60 * 60 * 1000,
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
    cooldownMs: 8_000,
    deleteDuringCooldown: true,
    warnAsEmbed: false,
    addRoleIds: [],
    removeRoleIds: [],
    minStrikesForRoles: 1,
  },
  checkEdits: true,
  checkDeletes: true,
  ignoreThreads: false,
  ignoreSystem: true,
  cleanupIntervalMs: 60_000,
  disabledDetectors: [],
  detectorOrder: [],
  channelOverrides: {},
  roleOverrides: {},
};

const PRESET_OVERRIDES: Record<PresetName, DeepPartial<ResolvedConfig>> = {
  lenient: {
    flood: { maxMessages: 8, windowMs: 4000 },
    duplicates: { maxRepeats: 4, similarity: 0.95 },
    images: { maxRepeats: 4 },
    mentions: { maxMentions: 10, blockEveryone: true },
    caps: { enabled: false },
    emojis: { maxEmojis: 20 },
    zalgo: { enabled: false },
    newlines: { maxNewlines: 25 },
    hop: { enabled: false },
    punctuation: { enabled: false },
    spoilers: { maxSpoilers: 15 },
    links: {
      blockInvites: false,
      blockShorteners: false,
    },
    punishment: {
      timeout: { enabled: false, durationMs: 30_000, minStrikes: 3 },
    },
    locale: "en",
  },
  balanced: {},
  strict: {
    flood: { maxMessages: 3, windowMs: 4000, severity: "high" },
    duplicates: { maxRepeats: 2, similarity: 0.85, severity: "high" },
    images: { maxRepeats: 2, crossUserThreshold: 4, severity: "high" },
    mentions: { maxMentions: 3 },
    caps: { minLength: 10, maxPercent: 65 },
    emojis: { maxEmojis: 8, maxStickers: 2 },
    zalgo: { maxCombining: 10 },
    newlines: { maxNewlines: 8 },
    links: {
      blockInvites: true,
      blockShorteners: true,
      maxLinks: 4,
      severity: "critical",
    },
    accounts: { enabled: true, minAgeDays: 1, minGuildAgeDays: 0 },
    length: { enabled: true, maxCharacters: 800 },
    hop: { maxChannels: 3, windowMs: 6_000 },
    ghostPing: { enabled: true },
    words: { enabled: false },
    punishment: {
      timeout: { enabled: true, durationMs: 5 * 60_000, minStrikes: 1, scale: "linear" },
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

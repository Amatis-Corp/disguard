import type { Client, Message } from "discord.js";

export type DetectorType =
  | "flood"
  | "duplicate"
  | "link"
  | "image"
  | "mention"
  | "caps"
  | "emoji"
  | "file"
  | "zalgo"
  | "newline"
  | "account"
  | "length"
  | "word"
  | "hop"
  | "punctuation"
  | "spoiler"
  | "ghost"
  | "invisible"
  | "echo"
  | "secret"
  | "attach"
  | "reply"
  | "blank"
  | "embed"
  | "raid";

export type Locale = "en" | "es";

export type TimeoutScale = "none" | "linear" | "exponential";

export type Severity = "low" | "medium" | "high" | "critical";

export type ActionType = "delete" | "warn" | "timeout" | "kick" | "ban" | "addRole" | "removeRole" | "purge";

export type ImageHashMode = "meta" | "content";

export type PresetName = "lenient" | "balanced" | "strict";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface Incident {
  type: DetectorType;
  severity: Severity;
  userId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  reason: string;
  details: Record<string, unknown>;
  recommendedActions: ActionType[];
  timestamp: number;
}

export interface ActionResult {
  incident: Incident;
  dryRun: boolean;
  applied: ActionType[];
  skipped: Array<{ action: ActionType; reason: string }>;
  error?: string;
}

export interface MessageSnapshot {
  id: string;
  channelId: string;
  content: string;
  normalized: string;
  timestamp: number;
  attachmentHashes: string[];
  attachmentCount: number;
  mentionCount: number;
  isReply: boolean;
  emojiCount: number;
  embedCount: number;
}

export interface IgnoreLists {
  users: string[];
  roles: string[];
  channels: string[];
  categories: string[];
  guilds: string[];
  /** Skip messages that start with these prefixes (`!`, `/`, `.`). */
  prefixes: string[];
}

export interface FloodConfig {
  enabled: boolean;
  maxMessages: number;
  windowMs: number;
  /** If true, only counts messages in the same channel. */
  sameChannelOnly: boolean;
  severity: Severity;
}

export interface DuplicateConfig {
  enabled: boolean;
  maxRepeats: number;
  windowMs: number;
  similarity: number;
  sameChannelOnly: boolean;
  /** Ignore duplicates shorter than this (after normalize). */
  minLength: number;
  severity: Severity;
}

export interface LinkConfig {
  enabled: boolean;
  /** Bloquea invitaciones de Discord (discord.gg / discord.com/invite). */
  blockInvites: boolean;
  /** Bloquea acortadores (bit.ly, t.co, tinyurl, etc.). */
  blockShorteners: boolean;
  /** Bloquea enlaces a IPs literales (http://1.2.3.4). */
  blockIpLinks: boolean;
  /** Bloquea dominios punycode / homógrafos (xn--). */
  blockPunycode: boolean;
  /** Detecta clones de marcas (dlscord, steamcommunnity, ...). */
  blockBrandLookalikes: boolean;
  /** Combina palabras de estafa + enlace (nitro gratis, steam gift...). */
  detectPhishingKeywords: boolean;
  /** Dominios o hosts siempre permitidos. */
  allowList: string[];
  /** Dominios o hosts siempre bloqueados. */
  blockList: string[];
  /** TLDs sospechosos extra. Vacío = no se usa. */
  suspiciousTlds: string[];
  /** Expresiones regulares extra sobre la URL o el mensaje. */
  customPatterns: string[];
  /** Palabras extra que, junto a un enlace, se consideran phishing. */
  extraPhishingKeywords: string[];
  /** Max URLs in one message. 0 = unlimited. */
  maxLinks: number;
  /** Also scan embed title/description/fields. */
  scanEmbeds: boolean;
  /** Flag non-allowlisted URLs whose path looks like OAuth/login. */
  blockOauth: boolean;
  severity: Severity;
}

export interface ImageConfig {
  enabled: boolean;
  /** Veces que se puede reenviar la misma imagen. */
  maxRepeats: number;
  windowMs: number;
  /**
   * `meta` usa tamaño + tipo + nombre (rápido, sin descargar).
   * `content` descarga el archivo y hace SHA-256 (más preciso).
   */
  hashMode: ImageHashMode;
  /** Tamaño máximo a descargar en modo `content` (bytes). */
  maxDownloadBytes: number;
  /** Incluye stickers en la detección. */
  includeStickers: boolean;
  /** Incluye imágenes de embeds. */
  includeEmbeds: boolean;
  /**
   * Si varios usuarios distintos pegan la misma imagen en poco tiempo
   * (raid / copypasta visual). 0 = desactivado.
   */
  crossUserThreshold: number;
  /** MIME types to skip, e.g. `["image/gif"]`. */
  skipContentTypes: string[];
  /** Max image attachments per message. 0 = unlimited. */
  maxAttachments: number;
  severity: Severity;
}

export interface MentionConfig {
  enabled: boolean;
  maxMentions: number;
  blockEveryone: boolean;
  blockHere: boolean;
  /** Same user mentioned this many times in one message. 0 = off. */
  maxRepeatsOfSame: number;
  /** Mentions across messages in a window. 0 = off. */
  maxInWindow: number;
  windowMs: number;
  severity: Severity;
}

export interface CapsConfig {
  enabled: boolean;
  minLength: number;
  /** Porcentaje 0-100 de mayúsculas para considerarlo spam. */
  maxPercent: number;
  severity: Severity;
}

export interface EmojiConfig {
  enabled: boolean;
  maxEmojis: number;
  maxStickers: number;
  /** Emojis + stickers across messages. 0 = off. */
  maxInWindow: number;
  windowMs: number;
  severity: Severity;
}

export interface FileConfig {
  enabled: boolean;
  /** Extensiones bloqueadas, con o sin punto: `exe`, `.bat`. */
  blockedExtensions: string[];
  /**
   * If non-empty, only these extensions are allowed (allowlist).
   * `blockedExtensions` still applies first.
   */
  allowedExtensions: string[];
  /** Max attachment size in bytes. 0 = unlimited. */
  maxBytes: number;
  severity: Severity;
}

export interface ZalgoConfig {
  enabled: boolean;
  /** Máximo de marcas combinantes (zalgo / diacríticos apilados). */
  maxCombining: number;
  severity: Severity;
}

export interface NewlineConfig {
  enabled: boolean;
  maxNewlines: number;
  severity: Severity;
}

export interface AccountConfig {
  enabled: boolean;
  /** Accounts younger than this many days are flagged. */
  minAgeDays: number;
  /** Flag users still using the default Discord avatar. */
  blockDefaultAvatar: boolean;
  /** Minimum days the member must have been in this guild. 0 = off. */
  minGuildAgeDays: number;
  /** If true, age checks only run when the message contains a URL. */
  onlyWithLinks: boolean;
  severity: Severity;
}

export interface LengthConfig {
  enabled: boolean;
  maxCharacters: number;
  severity: Severity;
}

export interface WordConfig {
  enabled: boolean;
  list: string[];
  regex: string[];
  ignoreCase: boolean;
  matchWholeWord: boolean;
  severity: Severity;
}

export interface HopConfig {
  enabled: boolean;
  /** Unique channels posted in during the window. */
  maxChannels: number;
  windowMs: number;
  severity: Severity;
}

export interface PunctuationConfig {
  enabled: boolean;
  /** `aaaaaa` / `!!!!!!` longer than this is flagged. */
  maxRepeated: number;
  severity: Severity;
}

export interface SpoilerConfig {
  enabled: boolean;
  maxSpoilers: number;
  severity: Severity;
}

export interface GhostPingConfig {
  enabled: boolean;
  minMentions: number;
  /** Only if the message is deleted within this time. 0 = any age. */
  maxAgeMs: number;
  severity: Severity;
}

export interface InvisibleConfig {
  enabled: boolean;
  /** Zero-width / bidi / BOM characters allowed in one message. */
  maxInvisible: number;
  severity: Severity;
}

export interface EchoConfig {
  enabled: boolean;
  /** Unique channels the same text appeared in. */
  maxChannels: number;
  windowMs: number;
  similarity: number;
  minLength: number;
  severity: Severity;
}

export interface SecretConfig {
  enabled: boolean;
  botTokens: boolean;
  webhooks: boolean;
  extraPatterns: string[];
  scanEmbeds: boolean;
  severity: Severity;
}

export interface AttachConfig {
  enabled: boolean;
  /** Attachments across messages in the window (includes the current one). */
  maxAttachments: number;
  windowMs: number;
  severity: Severity;
}

export interface ReplyConfig {
  enabled: boolean;
  maxReplies: number;
  windowMs: number;
  severity: Severity;
}

export interface BlankConfig {
  enabled: boolean;
  severity: Severity;
}

export interface EmbedConfig {
  enabled: boolean;
  /** Embeds in a single message. */
  maxEmbeds: number;
  severity: Severity;
}

export interface RaidConfig {
  enabled: boolean;
  /** Distinct users posting in the same channel during the window. */
  maxUsers: number;
  windowMs: number;
  severity: Severity;
}

export interface TimeoutPunishment {
  enabled: boolean;
  durationMs: number;
  minStrikes: number;
  /** `linear` = base * strikes, `exponential` = base * 2^(strikes-1). */
  scale: TimeoutScale;
  /** Cap for scaled timeouts (Discord max is 28 days). */
  maxDurationMs: number;
}

export interface BooleanPunishment {
  enabled: boolean;
  minStrikes: number;
}

export interface PunishmentConfig {
  deleteMessage: boolean;
  warnUser: boolean;
  /** Si es true, avisa por DM. Si no, responde en el canal. */
  dmUser: boolean;
  /** Plantilla. Placeholders: {user}, {reason}, {type}, {strikes}. */
  warnMessage: string;
  timeout: TimeoutPunishment;
  kick: BooleanPunishment;
  ban: BooleanPunishment;
  /** Acumula strikes y aplica el castigo más alto alcanzado. */
  escalate: boolean;
  /** Canal donde se envía un embed de log. */
  logChannelId: string | null;
  /** Los strikes caducan tras este tiempo. 0 = nunca. */
  strikeDecayMs: number;
  /**
   * Tras un castigo, no vuelve a avisar/timeout/kick/ban durante este tiempo.
   * Evita 4 timeouts seguidos en el mismo burst de flood.
   */
  cooldownMs: number;
  deleteDuringCooldown: boolean;
  warnAsEmbed: boolean;
  /** Roles to add on punish (mute role, etc.). */
  addRoleIds: string[];
  /** Roles to remove on punish. */
  removeRoleIds: string[];
  minStrikesForRoles: number;
  /**
   * After punish, bulk-delete this many of the user's recent messages in the channel
   * (not including the triggering one if already deleted). 0 = off.
   */
  purgeCount: number;
  /** Discord webhook URL for log embeds. Independent from `logChannelId`. */
  logWebhookUrl: string | null;
}

export interface ResolvedConfig {
  enabled: boolean;
  dryRun: boolean;
  locale: Locale;
  ignoreBots: boolean;
  ignoreWebhooks: boolean;
  ignoreOwner: boolean;
  ignoreAdministrators: boolean;
  /**
   * Extra permission names that skip checks, e.g. `["ManageMessages", "ModerateMembers"]`.
   * Uses discord.js `PermissionFlagsBits` keys.
   */
  ignorePermissions: string[];
  ignored: IgnoreLists;
  flood: FloodConfig;
  duplicates: DuplicateConfig;
  links: LinkConfig;
  images: ImageConfig;
  mentions: MentionConfig;
  caps: CapsConfig;
  emojis: EmojiConfig;
  files: FileConfig;
  zalgo: ZalgoConfig;
  newlines: NewlineConfig;
  accounts: AccountConfig;
  length: LengthConfig;
  words: WordConfig;
  hop: HopConfig;
  punctuation: PunctuationConfig;
  spoilers: SpoilerConfig;
  ghostPing: GhostPingConfig;
  invisible: InvisibleConfig;
  echo: EchoConfig;
  secrets: SecretConfig;
  attach: AttachConfig;
  replies: ReplyConfig;
  blank: BlankConfig;
  embeds: EmbedConfig;
  raid: RaidConfig;
  punishment: PunishmentConfig;
  checkEdits: boolean;
  /** Listen for `messageDelete` (ghost pings). */
  checkDeletes: boolean;
  ignoreThreads: boolean;
  ignoreSystem: boolean;
  ignorePinned: boolean;
  /** Skip messages older than this (reconnect replay). 0 = off. */
  ignoreOlderThanMs: number;
  /** Skip messages in NSFW channels. */
  ignoreNsfw: boolean;
  /**
   * First N messages from a user in a guild only run file/secret/link/word.
   * 0 = off. Lets new talkers say hi without tripping flood.
   */
  graceMessages: number;
  cleanupIntervalMs: number;
  disabledDetectors: DetectorType[];
  detectorOrder: DetectorType[];
  channelOverrides: Record<string, DeepPartial<ResolvedConfig>>;
  roleOverrides: Record<string, DeepPartial<ResolvedConfig>>;
  userOverrides: Record<string, DeepPartial<ResolvedConfig>>;
}

export interface AntiSpamStats {
  analyzed: number;
  incidents: number;
  suppressed: number;
  byType: Record<DetectorType, number>;
  actions: Record<ActionType, number>;
}

export interface AntiSpamOptions extends DeepPartial<ResolvedConfig> {
  preset?: PresetName;
  onDetect?: (incident: Incident, message: Message) => void | Promise<void>;
  onAction?: (result: ActionResult) => void | Promise<void>;
  onError?: (error: unknown, context: string) => void;
  onCooldown?: (message: Message) => void | Promise<void>;
}

export interface AnalyzeContext {
  client: Client;
  config: ResolvedConfig;
  now: number;
}

export interface DetectorInput {
  message: Message;
  snapshot: MessageSnapshot;
  history: MessageSnapshot[];
  config: ResolvedConfig;
  now: number;
  uniqueUsersInChannel: number;
}

export interface Detector {
  type: DetectorType;
  inspect(input: DetectorInput): Promise<Incident | null> | Incident | null;
}

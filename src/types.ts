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
  | "length";

export type Locale = "en" | "es";

export type TimeoutScale = "none" | "linear" | "exponential";

export type Severity = "low" | "medium" | "high" | "critical";

export type ActionType = "delete" | "warn" | "timeout" | "kick" | "ban";

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
}

export interface IgnoreLists {
  users: string[];
  roles: string[];
  channels: string[];
  categories: string[];
  guilds: string[];
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
  severity: Severity;
}

export interface FileConfig {
  enabled: boolean;
  /** Extensiones bloqueadas, con o sin punto: `exe`, `.bat`. */
  blockedExtensions: string[];
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
  severity: Severity;
}

export interface LengthConfig {
  enabled: boolean;
  maxCharacters: number;
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
  /** Send the warning as an embed instead of plain text. */
  warnAsEmbed: boolean;
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
  punishment: PunishmentConfig;
  checkEdits: boolean;
  cleanupIntervalMs: number;
  /** Skip these detectors even if their `enabled` flag is true. */
  disabledDetectors: DetectorType[];
  /** Custom run order. Empty = built-in order. */
  detectorOrder: DetectorType[];
  /** Per-channel patches keyed by channel snowflake. */
  channelOverrides: Record<string, DeepPartial<ResolvedConfig>>;
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
}

export interface Detector {
  type: DetectorType;
  inspect(input: DetectorInput): Promise<Incident | null> | Incident | null;
}

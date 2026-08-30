import type { Client, Message } from "discord.js";

export type DetectorType =
  | "flood"
  | "duplicate"
  | "link"
  | "image"
  | "mention"
  | "caps"
  | "emoji";

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
  /** Activa el detector de flood (muchos mensajes en poco tiempo). */
  enabled: boolean;
  /** Máximo de mensajes permitidos dentro de la ventana. */
  maxMessages: number;
  /** Ventana deslizante en milisegundos. */
  windowMs: number;
  severity: Severity;
}

export interface DuplicateConfig {
  /** Activa el detector de texto repetido. */
  enabled: boolean;
  /** Veces que se puede repetir el mismo (o muy similar) mensaje. */
  maxRepeats: number;
  windowMs: number;
  /**
   * Umbral 0-1. 1 = solo coincidencia exacta.
   * 0.85 detecta variaciones leves ("hola!!" vs "hola!").
   */
  similarity: number;
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
  severity: Severity;
}

export interface MentionConfig {
  enabled: boolean;
  maxMentions: number;
  blockEveryone: boolean;
  blockHere: boolean;
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

export interface TimeoutPunishment {
  enabled: boolean;
  durationMs: number;
  minStrikes: number;
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
}

export interface ResolvedConfig {
  enabled: boolean;
  dryRun: boolean;
  ignoreBots: boolean;
  ignoreWebhooks: boolean;
  ignoreOwner: boolean;
  /** Ignora miembros con permiso Administrator. */
  ignoreAdministrators: boolean;
  ignored: IgnoreLists;
  flood: FloodConfig;
  duplicates: DuplicateConfig;
  links: LinkConfig;
  images: ImageConfig;
  mentions: MentionConfig;
  caps: CapsConfig;
  emojis: EmojiConfig;
  punishment: PunishmentConfig;
  /** Revisa también ediciones de mensajes. */
  checkEdits: boolean;
  /** Intervalo de limpieza de memoria. */
  cleanupIntervalMs: number;
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

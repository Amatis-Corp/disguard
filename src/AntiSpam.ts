import {
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";
import { mergeDeep, resolveConfig } from "./defaults";
import { capsDetector } from "./detectors/caps";
import { duplicateDetector } from "./detectors/duplicates";
import { emojiDetector } from "./detectors/emojis";
import { floodDetector } from "./detectors/flood";
import { createImageDetector } from "./detectors/images";
import { linkDetector } from "./detectors/links";
import { mentionDetector } from "./detectors/mentions";
import { applyPunishment } from "./enforcement";
import { MemoryStore } from "./store/MemoryStore";
import type {
  AntiSpamOptions,
  DeepPartial,
  Detector,
  Incident,
  MessageSnapshot,
  ResolvedConfig,
} from "./types";
import { normalizeText } from "./utils/normalize";

export class AntiSpam {
  readonly client: Client;
  readonly store = new MemoryStore();

  private config: ResolvedConfig;
  private readonly detectors: Detector[];
  private readonly options: AntiSpamOptions;
  private started = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly onMessage = (message: Message): void => {
    void this.handle(message, false);
  };

  private readonly onEdit = (oldMessage: Message | { partial: true }, newMessage: Message): void => {
    if (oldMessage && "partial" in oldMessage && oldMessage.partial) return;
    void this.handle(newMessage, true);
  };

  constructor(client: Client, options: AntiSpamOptions = {}) {
    this.client = client;
    this.options = options;
    const { preset, onDetect: _onDetect, onAction: _onAction, onError: _onError, ...configOptions } = options;
    this.config = resolveConfig(preset, configOptions);
    this.detectors = [
      floodDetector,
      duplicateDetector,
      linkDetector,
      createImageDetector(this.store),
      mentionDetector,
      capsDetector,
      emojiDetector,
    ];
  }

  /** Empieza a escuchar `messageCreate` (y `messageUpdate` si está activo). */
  start(): this {
    if (this.started) return this;
    this.client.on("messageCreate", this.onMessage);
    if (this.config.checkEdits) {
      this.client.on("messageUpdate", this.onEdit);
    }
    this.cleanupTimer = setInterval(() => {
      this.store.cleanup(Date.now(), this.maxRetentionMs());
    }, this.config.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
    this.started = true;
    return this;
  }

  /** Deja de escuchar eventos. Llama esto al apagar el bot. */
  stop(): this {
    if (!this.started) return this;
    this.client.off("messageCreate", this.onMessage);
    this.client.off("messageUpdate", this.onEdit);
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.started = false;
    return this;
  }

  getConfig(): ResolvedConfig {
    return structuredClone(this.config);
  }

  setConfig(patch: DeepPartial<ResolvedConfig>): ResolvedConfig {
    this.config = mergeDeep(this.config, patch);
    return this.getConfig();
  }

  getStrikes(guildId: string, userId: string): number {
    return this.store.getStrikes(guildId, userId, Date.now(), this.config.punishment.strikeDecayMs);
  }

  resetUser(guildId: string, userId: string): void {
    this.store.resetUser(guildId, userId);
  }

  /**
   * Analiza un mensaje sin aplicar castigos.
   * Útil para tests o para integrar tu propio sistema de sanciones.
   */
  async analyze(message: Message, options: { isEdit?: boolean } = {}): Promise<Incident | null> {
    if (this.shouldIgnore(message)) return null;
    if (!message.guild) return null;

    const now = Date.now();
    const snapshot = this.toSnapshot(message, now);
    const history = options.isEdit
      ? this.store.getHistory(message.guild.id, message.author.id, now, this.maxRetentionMs())
      : this.store.pushMessage(
          message.guild.id,
          message.author.id,
          snapshot,
          this.maxRetentionMs(),
        );

    const detectors = options.isEdit
      ? this.detectors.filter((detector) => detector.type === "link" || detector.type === "mention")
      : this.detectors;

    for (const detector of detectors) {
      try {
        const incident = await detector.inspect({
          message,
          snapshot,
          history,
          config: this.config,
          now,
        });
        if (incident) return incident;
      } catch (error) {
        this.options.onError?.(error, `detector:${detector.type}`);
      }
    }

    return null;
  }

  private async handle(message: Message, isEdit: boolean): Promise<void> {
    if (!this.config.enabled) return;
    if (isEdit && !this.config.checkEdits) return;

    try {
      const incident = await this.analyze(message, { isEdit });
      if (!incident) return;

      await this.options.onDetect?.(incident, message);

      const strikes = this.store.addStrike(
        incident.guildId,
        incident.userId,
        Date.now(),
        this.config.punishment.strikeDecayMs,
      );

      const result = await applyPunishment(message, incident, strikes, this.config);
      await this.options.onAction?.(result);
    } catch (error) {
      this.options.onError?.(error, "handle");
    }
  }

  shouldIgnore(message: Message): boolean {
    const { config } = this;

    if (message.author.bot && config.ignoreBots) return true;
    if (message.webhookId && config.ignoreWebhooks) return true;
    if (!message.guild) return true;
    if (config.ignored.guilds.includes(message.guild.id)) return true;
    if (config.ignored.channels.includes(message.channelId)) return true;
    if (config.ignored.users.includes(message.author.id)) return true;

    const parentId = "parentId" in message.channel ? message.channel.parentId : null;
    if (parentId && config.ignored.categories.includes(parentId)) return true;

    if (config.ignoreOwner && message.author.id === message.guild.ownerId) return true;

    const member = message.member;
    if (member) {
      if (config.ignoreAdministrators && member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }
      if (config.ignored.roles.some((roleId) => member.roles.cache.has(roleId))) {
        return true;
      }
    }

    return false;
  }

  private toSnapshot(message: Message, now: number): MessageSnapshot {
    return {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      normalized: normalizeText(message.content),
      timestamp: now,
      attachmentHashes: [],
    };
  }

  private maxRetentionMs(): number {
    const windows = [
      this.config.flood.windowMs,
      this.config.duplicates.windowMs,
      this.config.images.windowMs,
      this.config.punishment.strikeDecayMs,
    ];
    return Math.max(30_000, ...windows);
  }
}

export function createAntiSpam(client: Client, options?: AntiSpamOptions): AntiSpam {
  return new AntiSpam(client, options);
}

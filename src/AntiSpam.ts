import {
  PermissionFlagsBits,
  type Client,
  type Message,
  type PartialMessage,
} from "discord.js";
import { mergeDeep, resolveConfig } from "./defaults";
import { accountDetector } from "./detectors/accounts";
import { attachDetector } from "./detectors/attach";
import { capsDetector } from "./detectors/caps";
import { duplicateDetector } from "./detectors/duplicates";
import { echoDetector } from "./detectors/echo";
import { emojiDetector } from "./detectors/emojis";
import { fileDetector } from "./detectors/files";
import { floodDetector } from "./detectors/flood";
import { inspectGhostPing } from "./detectors/ghost";
import { hopDetector } from "./detectors/hop";
import { createImageDetector } from "./detectors/images";
import { invisibleDetector } from "./detectors/invisible";
import { lengthDetector } from "./detectors/length";
import { linkDetector } from "./detectors/links";
import { mentionDetector } from "./detectors/mentions";
import { newlineDetector } from "./detectors/newlines";
import { punctuationDetector } from "./detectors/punctuation";
import { secretDetector } from "./detectors/secrets";
import { spoilerDetector } from "./detectors/spoilers";
import { wordDetector } from "./detectors/words";
import { zalgoDetector } from "./detectors/zalgo";
import { applyPunishment } from "./enforcement";
import { MemoryStore } from "./store/MemoryStore";
import type {
  ActionType,
  AntiSpamOptions,
  AntiSpamStats,
  DeepPartial,
  Detector,
  DetectorType,
  Incident,
  MessageSnapshot,
  ResolvedConfig,
} from "./types";
import { normalizeText } from "./utils/normalize";

const DETECTOR_TYPES: DetectorType[] = [
  "flood",
  "duplicate",
  "link",
  "image",
  "mention",
  "caps",
  "emoji",
  "file",
  "zalgo",
  "newline",
  "account",
  "length",
  "word",
  "hop",
  "punctuation",
  "spoiler",
  "ghost",
  "invisible",
  "echo",
  "secret",
  "attach",
];

const ACTION_TYPES: ActionType[] = ["delete", "warn", "timeout", "kick", "ban", "addRole", "removeRole", "purge"];

function emptyStats(): AntiSpamStats {
  return {
    analyzed: 0,
    incidents: 0,
    suppressed: 0,
    byType: Object.fromEntries(DETECTOR_TYPES.map((type) => [type, 0])) as AntiSpamStats["byType"],
    actions: Object.fromEntries(ACTION_TYPES.map((type) => [type, 0])) as AntiSpamStats["actions"],
  };
}

export class AntiSpam {
  readonly client: Client;
  readonly store = new MemoryStore();

  private config: ResolvedConfig;
  private readonly detectors: Detector[];
  private readonly options: AntiSpamOptions;
  private readonly guildConfigs = new Map<string, DeepPartial<ResolvedConfig>>();
  private readonly channelConfigs = new Map<string, DeepPartial<ResolvedConfig>>();
  private stats = emptyStats();
  private started = false;
  private paused = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly onMessage = (message: Message): void => {
    void this.handle(message, false);
  };

  private readonly onEdit = (oldMessage: Message | { partial: true }, newMessage: Message): void => {
    if (oldMessage && "partial" in oldMessage && oldMessage.partial) return;
    void this.handle(newMessage, true);
  };

  private readonly onDelete = (message: Message | PartialMessage): void => {
    void this.handleDelete(message);
  };

  constructor(client: Client, options: AntiSpamOptions = {}) {
    this.client = client;
    this.options = options;
    const { preset, onDetect: _d, onAction: _a, onError: _e, onCooldown: _c, ...configOptions } = options;
    this.config = resolveConfig(preset, configOptions);
    this.detectors = [
      fileDetector,
      secretDetector,
      wordDetector,
      floodDetector,
      hopDetector,
      echoDetector,
      duplicateDetector,
      attachDetector,
      linkDetector,
      createImageDetector(this.store),
      mentionDetector,
      zalgoDetector,
      newlineDetector,
      punctuationDetector,
      spoilerDetector,
      invisibleDetector,
      accountDetector,
      lengthDetector,
      capsDetector,
      emojiDetector,
    ];
  }

  /** Starts listening to `messageCreate` (and `messageUpdate` / `messageDelete` if enabled). */
  start(): this {
    if (this.started) return this;
    this.client.on("messageCreate", this.onMessage);
    if (this.config.checkEdits) {
      this.client.on("messageUpdate", this.onEdit);
    }
    if (this.config.checkDeletes) {
      this.client.on("messageDelete", this.onDelete);
    }
    this.cleanupTimer = setInterval(() => {
      this.store.cleanup(Date.now(), this.maxRetentionMs());
    }, this.config.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
    this.started = true;
    return this;
  }

  /** Stops listening. Call this on shutdown. */
  stop(): this {
    if (!this.started) return this;
    this.client.off("messageCreate", this.onMessage);
    this.client.off("messageUpdate", this.onEdit);
    this.client.off("messageDelete", this.onDelete);
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.started = false;
    return this;
  }

  /** Temporarily skip all enforcement without removing listeners. */
  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.paused = false;
    return this;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setEnabled(enabled: boolean): this {
    this.config = mergeDeep(this.config, { enabled });
    return this;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Adds a custom detector. It runs after the built-in ones. */
  use(detector: Detector): this {
    this.detectors.push(detector);
    return this;
  }

  getConfig(): ResolvedConfig {
    return structuredClone(this.config);
  }

  setConfig(patch: DeepPartial<ResolvedConfig>): ResolvedConfig {
    this.config = mergeDeep(this.config, patch);
    return this.getConfig();
  }

  /** Global defaults + this guild's overrides. */
  getGuildConfig(guildId: string): ResolvedConfig {
    return structuredClone(this.configFor(guildId));
  }

  setGuildConfig(guildId: string, patch: DeepPartial<ResolvedConfig>): ResolvedConfig {
    const previous = this.guildConfigs.get(guildId) ?? {};
    this.guildConfigs.set(guildId, mergeDeep(previous, patch));
    return this.getGuildConfig(guildId);
  }

  clearGuildConfig(guildId: string): void {
    this.guildConfigs.delete(guildId);
  }

  getChannelConfig(guildId: string, channelId: string): ResolvedConfig {
    return structuredClone(this.configFor(guildId, channelId));
  }

  setChannelConfig(guildId: string, channelId: string, patch: DeepPartial<ResolvedConfig>): ResolvedConfig {
    const key = `${guildId}:${channelId}`;
    const previous = this.channelConfigs.get(key) ?? {};
    this.channelConfigs.set(key, mergeDeep(previous, patch));
    return this.getChannelConfig(guildId, channelId);
  }

  clearChannelConfig(guildId: string, channelId: string): void {
    this.channelConfigs.delete(`${guildId}:${channelId}`);
  }

  setRoleConfig(roleId: string, patch: DeepPartial<ResolvedConfig>): void {
    const current = { ...this.config.roleOverrides };
    current[roleId] = mergeDeep(current[roleId] ?? {}, patch);
    this.config = mergeDeep(this.config, { roleOverrides: current });
  }

  clearRoleConfig(roleId: string): void {
    const current = { ...this.config.roleOverrides };
    delete current[roleId];
    this.config = { ...this.config, roleOverrides: current };
  }

  getStrikes(guildId: string, userId: string): number {
    return this.store.getStrikes(
      guildId,
      userId,
      Date.now(),
      this.configFor(guildId).punishment.strikeDecayMs,
    );
  }

  isCoolingDown(guildId: string, userId: string): boolean {
    const config = this.configFor(guildId);
    return this.store.isCoolingDown(guildId, userId, Date.now(), config.punishment.cooldownMs);
  }

  resetUser(guildId: string, userId: string): void {
    this.store.resetUser(guildId, userId);
  }

  getStats(): AntiSpamStats {
    return structuredClone(this.stats);
  }

  resetStats(): void {
    this.stats = emptyStats();
  }

  /**
   * Analyzes a message without punishing.
   * Useful for tests or your own sanction pipeline.
   */
  async analyze(message: Message, options: { isEdit?: boolean } = {}): Promise<Incident | null> {
    if (this.shouldIgnore(message)) return null;
    if (!message.guild) return null;

    const config = this.configFor(message.guild.id, message.channelId, message);
    const now = Date.now();
    const snapshot = this.toSnapshot(message, now);
    const history = options.isEdit
      ? this.store.getHistory(message.guild.id, message.author.id, now, this.maxRetentionMs(config))
      : this.store.pushMessage(
          message.guild.id,
          message.author.id,
          snapshot,
          this.maxRetentionMs(config),
        );

    this.stats.analyzed += 1;

    const detectors = this.orderedDetectors(config).filter((detector) => {
      if (config.disabledDetectors.includes(detector.type)) return false;
      if (options.isEdit) {
        return (
          detector.type === "link" ||
          detector.type === "mention" ||
          detector.type === "word" ||
          detector.type === "secret" ||
          detector.type === "invisible"
        );
      }
      return true;
    });

    for (const detector of detectors) {
      try {
        const incident = await detector.inspect({
          message,
          snapshot,
          history,
          config,
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
    if (this.paused) return;
    const config = message.guild ? this.configFor(message.guild.id, message.channelId, message) : this.config;
    if (!config.enabled) return;
    if (isEdit && !config.checkEdits) return;
    if (this.shouldIgnore(message)) return;
    if (!message.guild) return;

    try {
      if (this.store.isCoolingDown(message.guild.id, message.author.id, Date.now(), config.punishment.cooldownMs)) {
        this.stats.suppressed += 1;
        if (!isEdit) {
          this.store.pushMessage(
            message.guild.id,
            message.author.id,
            this.toSnapshot(message, Date.now()),
            this.maxRetentionMs(config),
          );
        }
        if (config.punishment.deleteDuringCooldown && !config.dryRun && message.deletable) {
          await message.delete().catch((error) => this.options.onError?.(error, "cooldown-delete"));
        }
        await this.options.onCooldown?.(message);
        return;
      }

      const incident = await this.analyze(message, { isEdit });
      if (!incident) return;

      this.stats.incidents += 1;
      this.stats.byType[incident.type] += 1;

      await this.options.onDetect?.(incident, message);

      const strikes = this.store.addStrike(
        incident.guildId,
        incident.userId,
        Date.now(),
        config.punishment.strikeDecayMs,
      );

      const result = await applyPunishment(message, incident, strikes, config);
      this.store.markAction(incident.guildId, incident.userId, Date.now());
      for (const action of result.applied) {
        this.stats.actions[action] += 1;
      }
      await this.options.onAction?.(result);
    } catch (error) {
      this.options.onError?.(error, "handle");
    }
  }

  private async handleDelete(message: Message | PartialMessage): Promise<void> {
    if (this.paused) return;
    if (message.partial) return;
    if (!message.guild) return;
    const config = this.configFor(message.guild.id, message.channelId, message);
    if (!config.enabled || !config.checkDeletes) return;
    if (this.shouldIgnore(message)) return;
    if (config.disabledDetectors.includes("ghost")) return;

    try {
      const incident = inspectGhostPing(message, config.ghostPing, Date.now());
      if (!incident) return;

      this.stats.incidents += 1;
      this.stats.byType.ghost += 1;
      await this.options.onDetect?.(incident, message);

      const strikes = this.store.addStrike(
        incident.guildId,
        incident.userId,
        Date.now(),
        config.punishment.strikeDecayMs,
      );
      const result = await applyPunishment(message, incident, strikes, config);
      this.store.markAction(incident.guildId, incident.userId, Date.now());
      for (const action of result.applied) {
        this.stats.actions[action] += 1;
      }
      await this.options.onAction?.(result);
    } catch (error) {
      this.options.onError?.(error, "handleDelete");
    }
  }

  shouldIgnore(message: Message): boolean {
    const config = message.guild ? this.configFor(message.guild.id, message.channelId, message) : this.config;

    if (message.author.bot && config.ignoreBots) return true;
    if (message.webhookId && config.ignoreWebhooks) return true;
    if (message.system && config.ignoreSystem) return true;
    if (message.pinned && config.ignorePinned) return true;
    if (config.ignoreOlderThanMs > 0 && message.createdTimestamp) {
      if (Date.now() - message.createdTimestamp > config.ignoreOlderThanMs) return true;
    }
    if (!message.guild) return true;
    if (config.ignored.guilds.includes(message.guild.id)) return true;
    if (config.ignored.channels.includes(message.channelId)) return true;
    if (config.ignored.users.includes(message.author.id)) return true;

    if (config.ignoreThreads && "isThread" in message.channel && typeof message.channel.isThread === "function" && message.channel.isThread()) {
      return true;
    }

    const trimmed = message.content.trimStart();
    if (config.ignored.prefixes.some((prefix) => prefix && trimmed.startsWith(prefix))) {
      return true;
    }

    const parentId = "parentId" in message.channel ? message.channel.parentId : null;
    if (parentId && config.ignored.categories.includes(parentId)) return true;

    if (config.ignoreOwner && message.author.id === message.guild.ownerId) return true;

    const member = message.member;
    if (member) {
      if (config.ignoreAdministrators && member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }
      for (const name of config.ignorePermissions) {
        const flag = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];
        if (flag && member.permissions.has(flag)) return true;
      }
      if (config.ignored.roles.some((roleId) => member.roles.cache.has(roleId))) {
        return true;
      }
    }

    return false;
  }

  private configFor(guildId: string, channelId?: string, message?: Message): ResolvedConfig {
    let resolved = this.config;
    const guildPatch = this.guildConfigs.get(guildId);
    if (guildPatch) resolved = mergeDeep(resolved, guildPatch);

    const member = message?.member;
    if (member) {
      for (const [roleId, patch] of Object.entries(resolved.roleOverrides)) {
        if (member.roles.cache.has(roleId) && patch) {
          resolved = mergeDeep(resolved, patch);
        }
      }
    }

    if (channelId && resolved.channelOverrides[channelId]) {
      resolved = mergeDeep(resolved, resolved.channelOverrides[channelId]);
    }
    if (channelId) {
      const runtime = this.channelConfigs.get(`${guildId}:${channelId}`);
      if (runtime) resolved = mergeDeep(resolved, runtime);
    }
    return resolved;
  }

  private orderedDetectors(config: ResolvedConfig): Detector[] {
    if (config.detectorOrder.length === 0) return this.detectors;
    return [...this.detectors].sort((left, right) => {
      const leftIndex = config.detectorOrder.indexOf(left.type);
      const rightIndex = config.detectorOrder.indexOf(right.type);
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    });
  }

  private toSnapshot(message: Message, now: number): MessageSnapshot {
    const mentionCount =
      [...message.mentions.users.values()].filter((user) => user.id !== message.author.id).length +
      message.mentions.roles.size +
      (message.mentions.everyone ? 1 : 0);

    return {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      normalized: normalizeText(message.content),
      timestamp: now,
      attachmentHashes: [],
      attachmentCount: message.attachments.size,
      mentionCount,
    };
  }

  private maxRetentionMs(config: ResolvedConfig = this.config): number {
    const windows = [
      config.flood.windowMs,
      config.duplicates.windowMs,
      config.images.windowMs,
      config.punishment.strikeDecayMs,
      config.punishment.cooldownMs,
      config.hop.windowMs,
      config.echo.windowMs,
      config.attach.windowMs,
      config.mentions.windowMs,
    ];
    return Math.max(30_000, ...windows);
  }
}

export function createAntiSpam(client: Client, options?: AntiSpamOptions): AntiSpam {
  return new AntiSpam(client, options);
}

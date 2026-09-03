import type { Message } from "discord.js";
import type { GhostPingConfig, Incident } from "../types";
import { createIncident } from "./incident";
import type { MessageSnapshot } from "../types";

export function inspectGhostPing(
  message: Message,
  config: GhostPingConfig,
  now: number,
): Incident | null {
  if (!config.enabled || !message.guild) return null;
  if (message.author.bot) return null;

  const mentionedUsers = [...message.mentions.users.values()].filter((user) => user.id !== message.author.id).length;
  const mentions =
    mentionedUsers + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);

  if (mentions < config.minMentions) return null;

  const created = message.createdTimestamp || now;
  if (config.maxAgeMs > 0 && now - created > config.maxAgeMs) return null;

  const snapshot: MessageSnapshot = {
    id: message.id,
    channelId: message.channelId,
    content: message.content,
    normalized: "",
    timestamp: now,
    attachmentHashes: [],
    attachmentCount: 0,
    mentionCount: 0,
    isReply: false,
    emojiCount: 0,
    embedCount: 0,
  };

  return createIncident("ghost", snapshot, {
    userId: message.author.id,
    guildId: message.guild.id,
    severity: config.severity,
    reason: `Posible ghost ping (${mentions} menciones, mensaje borrado)`,
    details: { mentions },
    recommendedActions: ["warn", "timeout"],
  });
}

import {
  EmbedBuilder,
  PermissionFlagsBits,
  type GuildMember,
  type Message,
} from "discord.js";
import { LOG_LABELS, resolveWarnMessage } from "./locale";
import type { ActionResult, ActionType, Incident, ResolvedConfig } from "./types";

const SEVERITY_COLOR: Record<Incident["severity"], number> = {
  low: 0xf1c40f,
  medium: 0xe67e22,
  high: 0xe74c3c,
  critical: 0x8b0000,
};

export async function applyPunishment(
  message: Message,
  incident: Incident,
  strikes: number,
  config: ResolvedConfig,
): Promise<ActionResult> {
  const result: ActionResult = {
    incident,
    dryRun: config.dryRun,
    applied: [],
    skipped: [],
  };

  const planned = planActions(incident, strikes, config);
  const member = message.member ?? (message.guild ? await message.guild.members.fetch(message.author.id).catch(() => null) : null);

  for (const action of planned) {
    const skip = canSkip(action, message, member, config);
    if (skip) {
      result.skipped.push({ action, reason: skip });
      continue;
    }

    if (config.dryRun) {
      result.applied.push(action);
      continue;
    }

    try {
      await executeAction(action, message, member, incident, strikes, config);
      result.applied.push(action);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.skipped.push({ action, reason: result.error });
    }
  }

  if (!config.dryRun) {
    await sendLog(message, incident, strikes, result, config).catch(() => undefined);
  }

  return result;
}

function planActions(incident: Incident, strikes: number, config: ResolvedConfig): ActionType[] {
  const actions: ActionType[] = [];
  const { punishment } = config;

  if (punishment.warnUser) actions.push("warn");
  if (punishment.deleteMessage) actions.push("delete");
  if (punishment.purgeCount > 0) actions.push("purge");

  if (!punishment.escalate) {
    return [...new Set(actions)];
  }

  if (punishment.ban.enabled && strikes >= punishment.ban.minStrikes) {
    actions.push("ban");
  } else if (punishment.kick.enabled && strikes >= punishment.kick.minStrikes) {
    actions.push("kick");
  } else if (punishment.timeout.enabled && strikes >= punishment.timeout.minStrikes) {
    actions.push("timeout");
  }

  if (punishment.addRoleIds.length > 0 && strikes >= punishment.minStrikesForRoles) {
    actions.push("addRole");
  }
  if (punishment.removeRoleIds.length > 0 && strikes >= punishment.minStrikesForRoles) {
    actions.push("removeRole");
  }

  return [...new Set(actions)];
}

function canSkip(
  action: ActionType,
  message: Message,
  member: GuildMember | null,
  config: ResolvedConfig,
): string | null {
  const me = message.guild?.members.me;
  if (!me) return "El bot no está en el servidor";

  if (action === "delete" && !message.deletable) {
    return "El mensaje no se puede borrar (permisos o antigüedad)";
  }

  if (action === "warn") return null;
  if (action === "purge") {
    const me = message.guild?.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return "Falta el permiso Manage Messages";
    }
    if (!("bulkDelete" in message.channel) || typeof message.channel.bulkDelete !== "function") {
      return "Este canal no permite borrar en lote";
    }
    return null;
  }
  if (action === "addRole" || action === "removeRole") {
    if (!member) return "No se pudo resolver el miembro";
    const me = message.guild?.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return "Falta el permiso Manage Roles";
    }
    return null;
  }

  if (!member) return "No se pudo resolver el miembro";
  if (member.id === message.guild?.ownerId) return "No se sanciona al dueño del servidor";
  if (member.id === me.id) return "No se sanciona al propio bot";
  if (!member.moderatable && action !== "delete") {
    return "El miembro está por encima del bot en la jerarquía";
  }

  if (action === "timeout" && !me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return "Falta el permiso Moderate Members";
  }
  if (action === "kick" && !me.permissions.has(PermissionFlagsBits.KickMembers)) {
    return "Falta el permiso Kick Members";
  }
  if (action === "ban" && !me.permissions.has(PermissionFlagsBits.BanMembers)) {
    return "Falta el permiso Ban Members";
  }

  void config;
  return null;
}

async function executeAction(
  action: ActionType,
  message: Message,
  member: GuildMember | null,
  incident: Incident,
  strikes: number,
  config: ResolvedConfig,
): Promise<void> {
  const reason = `[antispam:${incident.type}] ${incident.reason}`;

  if (action === "delete") {
    await message.delete();
    return;
  }

  if (action === "purge") {
    await purgeUserMessages(message, incident.userId, config.punishment.purgeCount);
    return;
  }

  if (action === "warn") {
    const text = resolveWarnMessage(config.locale, config.punishment.warnMessage)
      .replaceAll("{user}", `<@${incident.userId}>`)
      .replaceAll("{reason}", incident.reason)
      .replaceAll("{type}", incident.type)
      .replaceAll("{strikes}", String(strikes));

    const payload = config.punishment.warnAsEmbed
      ? {
          embeds: [
            new EmbedBuilder()
              .setColor(SEVERITY_COLOR[incident.severity])
              .setDescription(text),
          ],
        }
      : { content: text };

    if (config.punishment.dmUser) {
      await message.author.send(payload).catch(async () => {
        await replyOrSend(message, payload);
      });
    } else {
      await replyOrSend(message, payload);
    }
    return;
  }

  if (!member) return;

  if (action === "timeout") {
    await member.timeout(timeoutDuration(config, strikes), reason);
    return;
  }
  if (action === "kick") {
    await member.kick(reason);
    return;
  }
  if (action === "ban") {
    await member.ban({ reason, deleteMessageSeconds: 0 });
    return;
  }
  if (action === "addRole") {
    for (const roleId of config.punishment.addRoleIds) {
      await member.roles.add(roleId, reason).catch(() => undefined);
    }
    return;
  }
  if (action === "removeRole") {
    for (const roleId of config.punishment.removeRoleIds) {
      await member.roles.remove(roleId, reason).catch(() => undefined);
    }
  }
}

export function timeoutDuration(config: ResolvedConfig, strikes: number): number {
  const { durationMs, scale, maxDurationMs } = config.punishment.timeout;
  let ms = durationMs;
  if (scale === "linear") ms = durationMs * Math.max(1, strikes);
  if (scale === "exponential") ms = durationMs * 2 ** Math.max(0, strikes - 1);
  return Math.min(ms, maxDurationMs);
}

async function replyOrSend(
  message: Message,
  payload: { content?: string; embeds?: EmbedBuilder[] },
): Promise<void> {
  if (message.channel.isSendable()) {
    await message.channel.send(payload);
  }
}

async function sendLog(
  message: Message,
  incident: Incident,
  strikes: number,
  result: ActionResult,
  config: ResolvedConfig,
): Promise<void> {
  const webhook = config.punishment.logWebhookUrl;
  const channelId = config.punishment.logChannelId;
  if (!webhook && !channelId) return;

  const labels = LOG_LABELS[config.locale];
  const embed = new EmbedBuilder()
    .setColor(SEVERITY_COLOR[incident.severity])
    .setTitle(labels.title(incident.type))
    .setDescription(incident.reason)
    .addFields(
      { name: labels.user, value: `<@${incident.userId}> \`${incident.userId}\``, inline: true },
      { name: labels.channel, value: `<#${incident.channelId}>`, inline: true },
      { name: labels.severity, value: incident.severity, inline: true },
      { name: labels.strikes, value: String(strikes), inline: true },
      { name: labels.actions, value: result.applied.join(", ") || labels.none, inline: true },
      { name: labels.message, value: `[link](https://discord.com/channels/${incident.guildId}/${incident.channelId}/${incident.messageId})`, inline: true },
    )
    .setTimestamp(incident.timestamp);

  if (channelId && message.guild) {
    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased() && channel.isSendable()) {
      await channel.send({ embeds: [embed] });
    }
  }

  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed.toJSON()] }),
    }).catch(() => undefined);
  }
}

async function purgeUserMessages(message: Message, userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  const channel = message.channel;
  if (!("bulkDelete" in channel) || typeof channel.bulkDelete !== "function" || !("messages" in channel)) {
    return;
  }

  const fetched = await channel.messages.fetch({ limit: Math.min(100, Math.max(count + 5, 20)) });
  const targets = fetched.filter((item) => item.author.id === userId && item.id !== message.id);
  const toDelete = [...targets.values()].slice(0, count);
  if (toDelete.length === 0) return;
  await channel.bulkDelete(toDelete, true);
}

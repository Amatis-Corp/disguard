import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";
import { extractUrls } from "../utils/urls";

const DAY_MS = 24 * 60 * 60 * 1000;

function messageHasUrl(message: DetectorInput["message"]): boolean {
  if (extractUrls(message.content).length > 0) return true;
  for (const embed of message.embeds) {
    if (embed.url) return true;
    if (embed.description && extractUrls(embed.description).length > 0) return true;
  }
  return false;
}

export const accountDetector: Detector = {
  type: "account",
  inspect({ message, snapshot, config, now }: DetectorInput): Incident | null {
    const rules = config.accounts;
    if (!rules.enabled || !message.guild) return null;

    if (rules.blockDefaultAvatar && !message.author.avatar) {
      return createIncident("account", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: "Cuenta con avatar por defecto",
        recommendedActions: ["delete", "warn"],
      });
    }

    if (rules.onlyWithLinks && !messageHasUrl(message)) return null;

    if (rules.minGuildAgeDays > 0 && message.member?.joinedTimestamp) {
      const guildAgeDays = (now - message.member.joinedTimestamp) / DAY_MS;
      if (guildAgeDays < rules.minGuildAgeDays) {
        return createIncident("account", snapshot, {
          userId: message.author.id,
          guildId: message.guild.id,
          severity: rules.severity,
          reason: `Miembro demasiado nuevo en el servidor (${guildAgeDays.toFixed(1)} / ${rules.minGuildAgeDays} días)`,
          details: { guildAgeDays, minGuildAgeDays: rules.minGuildAgeDays },
          recommendedActions: ["delete", "warn"],
        });
      }
    }

    const created = message.author.createdTimestamp;
    if (!created) return null;

    const ageDays = (now - created) / DAY_MS;
    if (ageDays >= rules.minAgeDays) return null;

    return createIncident("account", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Cuenta demasiado nueva (${ageDays.toFixed(1)} / ${rules.minAgeDays} días)`,
      details: { ageDays, minAgeDays: rules.minAgeDays },
      recommendedActions: ["delete", "warn"],
    });
  },
};

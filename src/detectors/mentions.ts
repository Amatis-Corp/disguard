import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const mentionDetector: Detector = {
  type: "mention",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.mentions;
    if (!rules.enabled || !message.guild) return null;

    if (rules.blockEveryone && message.mentions.everyone && message.content.includes("@everyone")) {
      return createIncident("mention", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: "Mención masiva @everyone",
        recommendedActions: ["delete", "warn", "timeout"],
      });
    }

    if (rules.blockHere && message.content.includes("@here")) {
      return createIncident("mention", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: "Mención masiva @here",
        recommendedActions: ["delete", "warn", "timeout"],
      });
    }

    const unique = new Set([
      ...message.mentions.users.keys(),
      ...message.mentions.roles.keys(),
    ]);
    unique.delete(message.author.id);

    if (unique.size > rules.maxMentions) {
      return createIncident("mention", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: `Demasiadas menciones (${unique.size}/${rules.maxMentions})`,
        details: { count: unique.size },
        recommendedActions: ["delete", "warn"],
      });
    }

    return null;
  },
};

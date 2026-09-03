import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const blankDetector: Detector = {
  type: "blank",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.blank;
    if (!rules.enabled || !message.guild) return null;
    if (message.attachments.size > 0 || message.stickers.size > 0 || message.embeds.length > 0) {
      return null;
    }
    if (message.content.trim().length > 0) return null;

    return createIncident("blank", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: "Mensaje vacío o solo espacios",
      recommendedActions: ["delete"],
    });
  },
};

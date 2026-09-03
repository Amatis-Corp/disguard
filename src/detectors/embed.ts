import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const embedDetector: Detector = {
  type: "embed",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.embeds;
    if (!rules.enabled || !message.guild) return null;
    if (rules.maxEmbeds < 1) return null;
    if (message.embeds.length <= rules.maxEmbeds) return null;

    return createIncident("embed", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados embeds (${message.embeds.length}/${rules.maxEmbeds})`,
      details: { count: message.embeds.length },
      recommendedActions: ["delete", "warn"],
    });
  },
};

import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const lengthDetector: Detector = {
  type: "length",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.length;
    if (!rules.enabled || !message.guild) return null;
    if (message.content.length <= rules.maxCharacters) return null;

    return createIncident("length", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Mensaje demasiado largo (${message.content.length}/${rules.maxCharacters})`,
      details: { length: message.content.length },
      recommendedActions: ["delete", "warn"],
    });
  },
};

import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const punctuationDetector: Detector = {
  type: "punctuation",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.punctuation;
    if (!rules.enabled || !message.guild) return null;
    if (rules.maxRepeated < 2) return null;

    const match = message.content.match(new RegExp(`(.)\\1{${rules.maxRepeated},}`));
    if (!match) return null;

    return createIncident("punctuation", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Carácter repetido en exceso ("${match[1].repeat(Math.min(match[0].length, 12))}")`,
      details: { char: match[1], length: match[0].length },
      recommendedActions: ["delete", "warn"],
    });
  },
};

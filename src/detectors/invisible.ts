import { countInvisible } from "../utils/normalize";
import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const invisibleDetector: Detector = {
  type: "invisible",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.invisible;
    if (!rules.enabled || !message.guild) return null;

    const count = countInvisible(message.content);
    if (count <= rules.maxInvisible) return null;

    return createIncident("invisible", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados caracteres invisibles / bidi (${count}/${rules.maxInvisible})`,
      details: { count },
      recommendedActions: ["delete", "warn"],
    });
  },
};

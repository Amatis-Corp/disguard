import type { Detector, DetectorInput, Incident } from "../types";
import { countNewlines } from "../utils/normalize";
import { createIncident } from "./incident";

export const newlineDetector: Detector = {
  type: "newline",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.newlines;
    if (!rules.enabled || !message.guild) return null;

    const lines = countNewlines(message.content);
    if (lines <= rules.maxNewlines) return null;

    return createIncident("newline", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados saltos de línea (${lines}/${rules.maxNewlines})`,
      details: { newlines: lines },
      recommendedActions: ["delete", "warn"],
    });
  },
};

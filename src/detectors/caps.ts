import type { Detector, DetectorInput, Incident } from "../types";
import { lettersOnly } from "../utils/normalize";
import { createIncident } from "./incident";

export const capsDetector: Detector = {
  type: "caps",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.caps;
    if (!rules.enabled || !message.guild) return null;

    const letters = lettersOnly(message.content);
    if (letters.length < rules.minLength) return null;

    const upper = [...letters].filter((char) => char === char.toUpperCase() && char !== char.toLowerCase()).length;
    const percent = Math.round((upper / letters.length) * 100);
    if (percent < rules.maxPercent) return null;

    return createIncident("caps", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Exceso de mayúsculas (${percent}%)`,
      details: { percent, length: letters.length },
      recommendedActions: ["delete", "warn"],
    });
  },
};

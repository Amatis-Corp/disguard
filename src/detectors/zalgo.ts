import type { Detector, DetectorInput, Incident } from "../types";
import { countZalgo } from "../utils/normalize";
import { createIncident } from "./incident";

export const zalgoDetector: Detector = {
  type: "zalgo",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.zalgo;
    if (!rules.enabled || !message.guild) return null;

    const combining = countZalgo(message.content);
    if (combining <= rules.maxCombining) return null;

    return createIncident("zalgo", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Texto ofuscado / zalgo (${combining} marcas combinantes)`,
      details: { combining },
      recommendedActions: ["delete", "warn"],
    });
  },
};

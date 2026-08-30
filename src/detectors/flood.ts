import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const floodDetector: Detector = {
  type: "flood",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.flood;
    if (!rules.enabled || !message.guild) return null;

    const recent = history.filter((item) => snapshot.timestamp - item.timestamp <= rules.windowMs);
    if (recent.length < rules.maxMessages) return null;

    return createIncident("flood", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados mensajes seguidos (${recent.length}/${rules.maxMessages} en ${rules.windowMs}ms)`,
      details: { count: recent.length, windowMs: rules.windowMs },
      recommendedActions: ["delete", "warn", "timeout"],
    });
  },
};

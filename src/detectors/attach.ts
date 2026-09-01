import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const attachDetector: Detector = {
  type: "attach",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.attach;
    if (!rules.enabled || !message.guild) return null;
    if (snapshot.attachmentCount === 0) return null;

    let total = 0;
    for (const item of history) {
      if (snapshot.timestamp - item.timestamp > rules.windowMs) continue;
      total += item.attachmentCount ?? 0;
    }

    if (total < rules.maxAttachments) return null;

    return createIncident("attach", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados adjuntos seguidos (${total}/${rules.maxAttachments} en ${rules.windowMs}ms)`,
      details: { count: total, windowMs: rules.windowMs },
      recommendedActions: ["delete", "warn"],
    });
  },
};

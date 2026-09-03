import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const replyDetector: Detector = {
  type: "reply",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.replies;
    if (!rules.enabled || !message.guild) return null;
    if (!snapshot.isReply) return null;

    let count = 0;
    for (const item of history) {
      if (snapshot.timestamp - item.timestamp > rules.windowMs) continue;
      if (item.isReply) count += 1;
    }

    if (count < rules.maxReplies) return null;

    return createIncident("reply", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiadas respuestas seguidas (${count}/${rules.maxReplies} en ${rules.windowMs}ms)`,
      details: { count, windowMs: rules.windowMs },
      recommendedActions: ["delete", "warn"],
    });
  },
};

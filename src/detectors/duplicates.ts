import type { Detector, DetectorInput, Incident } from "../types";
import { similarity } from "../utils/similarity";
import { createIncident } from "./incident";

export const duplicateDetector: Detector = {
  type: "duplicate",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.duplicates;
    if (!rules.enabled || !message.guild) return null;
    if (!snapshot.normalized || snapshot.normalized.length < 2) return null;

    const recent = history.filter((item) => {
      if (item.id === snapshot.id) return false;
      if (snapshot.timestamp - item.timestamp > rules.windowMs) return false;
      if (rules.sameChannelOnly && item.channelId !== snapshot.channelId) return false;
      return true;
    });

    const matches = recent.filter((item) => {
      if (!item.normalized) return false;
      return similarity(snapshot.normalized, item.normalized) >= rules.similarity;
    });

    if (matches.length + 1 < rules.maxRepeats) return null;

    return createIncident("duplicate", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Mensaje repetido (${matches.length + 1} veces en ${rules.windowMs}ms)`,
      details: {
        repeats: matches.length + 1,
        similarity: rules.similarity,
        sample: snapshot.normalized.slice(0, 80),
      },
      recommendedActions: ["delete", "warn"],
    });
  },
};

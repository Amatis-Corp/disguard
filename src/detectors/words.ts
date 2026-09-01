import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const wordDetector: Detector = {
  type: "word",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.words;
    if (!rules.enabled || !message.guild) return null;
    if (rules.list.length === 0 && rules.regex.length === 0) return null;

    const text = rules.ignoreCase ? message.content.toLowerCase() : message.content;

    for (const raw of rules.list) {
      const needle = rules.ignoreCase ? raw.toLowerCase() : raw;
      if (!needle) continue;
      const hit = rules.matchWholeWord
        ? new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle)}([^\\p{L}\\p{N}]|$)`, "u").test(text)
        : text.includes(needle);
      if (hit) {
        return createIncident("word", snapshot, {
          userId: message.author.id,
          guildId: message.guild.id,
          severity: rules.severity,
          reason: `Palabra bloqueada: ${raw}`,
          details: { word: raw },
          recommendedActions: ["delete", "warn"],
        });
      }
    }

    for (const pattern of rules.regex) {
      try {
        const flags = rules.ignoreCase && !pattern.includes("(?i)") ? "i" : undefined;
        if (new RegExp(pattern, flags).test(message.content)) {
          return createIncident("word", snapshot, {
            userId: message.author.id,
            guildId: message.guild.id,
            severity: rules.severity,
            reason: "El mensaje coincide con un regex bloqueado",
            details: { pattern },
            recommendedActions: ["delete", "warn"],
          });
        }
      } catch {
        // Invalid regex is ignored.
      }
    }

    return null;
  },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

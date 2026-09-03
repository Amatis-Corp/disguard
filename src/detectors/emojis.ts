import type { Detector, DetectorInput, Incident } from "../types";
import { countEmojis } from "../utils/normalize";
import { createIncident } from "./incident";

export const emojiDetector: Detector = {
  type: "emoji",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.emojis;
    if (!rules.enabled || !message.guild) return null;

    if (message.stickers.size > rules.maxStickers) {
      return createIncident("emoji", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: `Demasiados stickers (${message.stickers.size}/${rules.maxStickers})`,
        recommendedActions: ["delete", "warn"],
      });
    }

    const emojis = countEmojis(message.content);
    if (emojis > rules.maxEmojis) {
      return createIncident("emoji", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: `Demasiados emojis (${emojis}/${rules.maxEmojis})`,
        details: { emojis },
        recommendedActions: ["delete", "warn"],
      });
    }

    if (rules.maxInWindow > 0) {
      let total = 0;
      for (const item of history) {
        if (snapshot.timestamp - item.timestamp > rules.windowMs) continue;
        total += item.emojiCount ?? 0;
      }
      if (total > rules.maxInWindow) {
        return createIncident("emoji", snapshot, {
          userId: message.author.id,
          guildId: message.guild.id,
          severity: rules.severity,
          reason: `Demasiados emojis en la ventana (${total}/${rules.maxInWindow})`,
          details: { count: total, windowMs: rules.windowMs },
          recommendedActions: ["delete", "warn"],
        });
      }
    }

    return null;
  },
};

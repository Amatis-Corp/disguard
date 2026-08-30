import type { Detector, DetectorInput, Incident } from "../types";
import { countEmojis } from "../utils/normalize";
import { createIncident } from "./incident";

export const emojiDetector: Detector = {
  type: "emoji",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
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

    return null;
  },
};

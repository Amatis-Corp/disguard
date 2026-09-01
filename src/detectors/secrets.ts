import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

/** Discord bot token shape. Used only to flag accidental leaks in chat. */
const BOT_TOKEN = /[A-Za-z0-9_-]{24,30}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/;
const WEBHOOK_URL =
  /https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i;

export const secretDetector: Detector = {
  type: "secret",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.secrets;
    if (!rules.enabled || !message.guild) return null;

    const text = rules.scanEmbeds ? collectText(message.content, message.embeds) : message.content;

    if (rules.webhooks && WEBHOOK_URL.test(text)) {
      return leak(snapshot, message.author.id, message.guild.id, rules.severity, "webhook");
    }

    if (rules.botTokens && BOT_TOKEN.test(text)) {
      return leak(snapshot, message.author.id, message.guild.id, rules.severity, "botToken");
    }

    for (const pattern of rules.extraPatterns) {
      try {
        if (new RegExp(pattern, "i").test(text)) {
          return leak(snapshot, message.author.id, message.guild.id, rules.severity, "custom");
        }
      } catch {
        // Invalid regex is ignored.
      }
    }

    return null;
  },
};

function leak(
  snapshot: DetectorInput["snapshot"],
  userId: string,
  guildId: string,
  severity: Incident["severity"],
  kind: string,
): Incident {
  return createIncident("secret", snapshot, {
    userId,
    guildId,
    severity,
    reason: "Posible secreto o token filtrado en el chat",
    details: { kind },
    recommendedActions: ["delete", "warn"],
  });
}

function collectText(content: string, embeds: DetectorInput["message"]["embeds"]): string {
  const parts = [content];
  for (const embed of embeds) {
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    if (embed.footer?.text) parts.push(embed.footer.text);
    for (const field of embed.fields ?? []) {
      parts.push(field.name, field.value);
    }
  }
  return parts.join("\n");
}

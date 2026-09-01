import type { Message } from "discord.js";
import type { Detector, DetectorInput, Incident } from "../types";
import {
  brandLookalike,
  extractUrls,
  hostMatchesList,
  isShortener,
  messageHasPhishingKeywords,
} from "../utils/urls";
import { createIncident } from "./incident";

export function collectMessageText(message: Message): string {
  const parts = [message.content];
  for (const embed of message.embeds) {
    if (embed.url) parts.push(embed.url);
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    if (embed.footer?.text) parts.push(embed.footer.text);
    if (embed.author?.url) parts.push(embed.author.url);
    for (const field of embed.fields) {
      parts.push(field.name, field.value);
    }
  }
  return parts.filter(Boolean).join("\n");
}

export const linkDetector: Detector = {
  type: "link",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.links;
    if (!rules.enabled || !message.guild) return null;

    const text = rules.scanEmbeds ? collectMessageText(message) : message.content;
    const urls = extractUrls(text);

    for (const pattern of rules.customPatterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(text)) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, "El mensaje coincide con un patrón personalizado", {
          pattern,
        });
      }
    }

    if (urls.length === 0) return null;

    if (rules.maxLinks > 0 && urls.length > rules.maxLinks) {
      return flag(
        snapshot,
        message.author.id,
        message.guild.id,
        rules.severity,
        `Demasiados enlaces (${urls.length}/${rules.maxLinks})`,
        { count: urls.length },
      );
    }

    for (const url of urls) {
      if (hostMatchesList(url.hostname, rules.allowList)) continue;

      if (rules.blockOauth) {
        try {
          const path = new URL(url.href).pathname.toLowerCase();
          if (path.includes("/oauth") || path.includes("/authorize") || path.includes("/login")) {
            return flag(
              snapshot,
              message.author.id,
              message.guild.id,
              "critical",
              `Posible enlace de login/OAuth: ${url.hostname}`,
              { url: url.href },
            );
          }
        } catch {
          // ignore
        }
      }

      if (hostMatchesList(url.hostname, rules.blockList)) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, `Dominio bloqueado: ${url.hostname}`, {
          url: url.href,
        });
      }

      if (rules.blockInvites && url.isInvite) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, "Invitación de Discord no permitida", {
          url: url.href,
        });
      }

      if (rules.blockShorteners && isShortener(url.hostname)) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, `Acortador de URL bloqueado: ${url.hostname}`, {
          url: url.href,
        });
      }

      if (rules.blockIpLinks && url.isIp) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, "Enlace a una IP literal", {
          url: url.href,
        });
      }

      if (rules.blockPunycode && url.isPunycode) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, "Dominio punycode / homógrafo", {
          url: url.href,
        });
      }

      if (rules.blockBrandLookalikes) {
        const brand = brandLookalike(url.hostname);
        if (brand) {
          return flag(
            snapshot,
            message.author.id,
            message.guild.id,
            "critical",
            `Posible clon de ${brand}: ${url.hostname}`,
            { url: url.href, brand },
          );
        }
      }

      if (rules.suspiciousTlds.length > 0) {
        const tld = url.hostname.split(".").pop() ?? "";
        if (rules.suspiciousTlds.includes(tld)) {
          return flag(snapshot, message.author.id, message.guild.id, rules.severity, `TLD no permitido: .${tld}`, {
            url: url.href,
          });
        }
      }
    }

    if (rules.detectPhishingKeywords) {
      const keyword = messageHasPhishingKeywords(text, rules.extraPhishingKeywords);
      if (keyword) {
        return flag(
          snapshot,
          message.author.id,
          message.guild.id,
          "critical",
          `Posible phishing ("${keyword}" + enlace)`,
          { keyword, urls: urls.map((item) => item.href) },
        );
      }
    }

    return null;
  },
};

function flag(
  snapshot: DetectorInput["snapshot"],
  userId: string,
  guildId: string,
  severity: Incident["severity"],
  reason: string,
  details: Record<string, unknown>,
): Incident {
  return createIncident("link", snapshot, {
    userId,
    guildId,
    severity,
    reason,
    details,
    recommendedActions: ["delete", "warn", "timeout"],
  });
}

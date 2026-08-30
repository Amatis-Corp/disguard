import type { Detector, DetectorInput, Incident } from "../types";
import {
  brandLookalike,
  extractUrls,
  hostMatchesList,
  isShortener,
  messageHasPhishingKeywords,
} from "../utils/urls";
import { createIncident } from "./incident";

export const linkDetector: Detector = {
  type: "link",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.links;
    if (!rules.enabled || !message.guild) return null;

    const urls = extractUrls(message.content);
    if (urls.length === 0) return null;

    for (const pattern of rules.customPatterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(message.content)) {
        return flag(snapshot, message.author.id, message.guild.id, rules.severity, "El mensaje coincide con un patrón personalizado", {
          pattern,
        });
      }
    }

    for (const url of urls) {
      if (hostMatchesList(url.hostname, rules.allowList)) continue;

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
      const keyword = messageHasPhishingKeywords(message.content, rules.extraPhishingKeywords);
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

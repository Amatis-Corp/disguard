import type { Attachment, Message } from "discord.js";
import type { Detector, DetectorInput, Incident } from "../types";
import { MemoryStore } from "../store/MemoryStore";
import { contentHashFromUrl, metaAttachmentHash } from "../utils/hash";
import { createIncident } from "./incident";

export function createImageDetector(store: MemoryStore): Detector {
  return {
    type: "image",
    async inspect({ message, snapshot, config, now }: DetectorInput): Promise<Incident | null> {
      const rules = config.images;
      if (!rules.enabled || !message.guild) return null;

      const hashes = await collectHashes(message, rules.hashMode, rules.maxDownloadBytes, {
        includeStickers: rules.includeStickers,
        includeEmbeds: rules.includeEmbeds,
      });

      if (hashes.length === 0) return null;

      snapshot.attachmentHashes = hashes;

      for (const hash of hashes) {
        store.addImageHit(hash, message.author.id, now);

        const userRepeats = store.countImageHits(hash, now, rules.windowMs, message.author.id);
        if (userRepeats >= rules.maxRepeats) {
          return createIncident("image", snapshot, {
            userId: message.author.id,
            guildId: message.guild.id,
            severity: rules.severity,
            reason: `Imagen o archivo repetido (${userRepeats} veces)`,
            details: { hash, repeats: userRepeats, mode: rules.hashMode },
            recommendedActions: ["delete", "warn"],
          });
        }

        if (rules.crossUserThreshold > 0) {
          const users = store.countDistinctUsersForImage(hash, now, rules.windowMs);
          if (users >= rules.crossUserThreshold) {
            return createIncident("image", snapshot, {
              userId: message.author.id,
              guildId: message.guild.id,
              severity: "high",
              reason: `La misma imagen la han enviado ${users} usuarios distintos`,
              details: { hash, users },
              recommendedActions: ["delete", "warn", "timeout"],
            });
          }
        }
      }

      return null;
    },
  };
}

export async function collectHashes(
  message: Message,
  mode: "meta" | "content",
  maxDownloadBytes: number,
  options: { includeStickers: boolean; includeEmbeds: boolean },
): Promise<string[]> {
  const hashes = new Set<string>();

  for (const attachment of message.attachments.values()) {
    if (!isMedia(attachment)) continue;
    const hash = await hashAttachment(attachment, mode, maxDownloadBytes);
    if (hash) hashes.add(hash);
  }

  if (options.includeStickers) {
    for (const sticker of message.stickers.values()) {
      hashes.add(metaAttachmentHash({
        name: sticker.name,
        size: 0,
        contentType: String(sticker.format),
        url: sticker.url,
      }));
    }
  }

  if (options.includeEmbeds) {
    for (const embed of message.embeds) {
      const url = embed.image?.url ?? embed.thumbnail?.url ?? embed.video?.url;
      if (!url) continue;
      hashes.add(metaAttachmentHash({ name: url, size: 0, contentType: "embed", url }));
    }
  }

  return [...hashes];
}

function isMedia(attachment: Attachment): boolean {
  const type = attachment.contentType ?? "";
  if (type.startsWith("image/") || type.startsWith("video/") || type.startsWith("gif")) return true;
  return /\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i.test(attachment.name ?? "");
}

async function hashAttachment(
  attachment: Attachment,
  mode: "meta" | "content",
  maxDownloadBytes: number,
): Promise<string | null> {
  if (mode === "content" && attachment.url) {
    try {
      const hashed = await contentHashFromUrl(attachment.url, maxDownloadBytes);
      if (hashed) return hashed;
    } catch {
      // Si falla la descarga, se usa el hash de metadatos.
    }
  }

  return metaAttachmentHash({
    name: attachment.name,
    size: attachment.size,
    contentType: attachment.contentType,
    url: attachment.url,
  });
}

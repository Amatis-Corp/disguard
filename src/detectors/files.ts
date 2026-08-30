import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const DEFAULT_BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "dll",
  "msi",
  "vbs",
  "ps1",
  "jar",
  "apk",
];

export const fileDetector: Detector = {
  type: "file",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.files;
    if (!rules.enabled || !message.guild || message.attachments.size === 0) return null;

    const blocked = new Set(
      rules.blockedExtensions.map((item) => item.replace(/^\./, "").toLowerCase()),
    );

    for (const attachment of message.attachments.values()) {
      const name = attachment.name ?? "";
      const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
      if (!ext || !blocked.has(ext)) continue;

      return createIncident("file", snapshot, {
        userId: message.author.id,
        guildId: message.guild.id,
        severity: rules.severity,
        reason: `Archivo no permitido: .${ext}`,
        details: { name, extension: ext, size: attachment.size },
        recommendedActions: ["delete", "warn", "timeout"],
      });
    }

    return null;
  },
};

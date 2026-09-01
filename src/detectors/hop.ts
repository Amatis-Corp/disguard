import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const hopDetector: Detector = {
  type: "hop",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.hop;
    if (!rules.enabled || !message.guild) return null;

    const channels = new Set<string>();
    for (const item of history) {
      if (snapshot.timestamp - item.timestamp > rules.windowMs) continue;
      channels.add(item.channelId);
    }
    channels.add(snapshot.channelId);

    if (channels.size < rules.maxChannels) return null;

    return createIncident("hop", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Salto de canales (${channels.size} canales en ${rules.windowMs}ms)`,
      details: { channels: [...channels] },
      recommendedActions: ["delete", "warn", "timeout"],
    });
  },
};

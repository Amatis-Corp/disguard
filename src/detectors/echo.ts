import { similarity } from "../utils/similarity";
import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const echoDetector: Detector = {
  type: "echo",
  inspect({ message, snapshot, history, config }: DetectorInput): Incident | null {
    const rules = config.echo;
    if (!rules.enabled || !message.guild) return null;
    if (snapshot.normalized.length < rules.minLength) return null;

    const channels = new Set<string>();
    for (const item of history) {
      if (snapshot.timestamp - item.timestamp > rules.windowMs) continue;
      if (item.normalized.length < rules.minLength) continue;
      if (similarity(snapshot.normalized, item.normalized) < rules.similarity) continue;
      channels.add(item.channelId);
    }
    channels.add(snapshot.channelId);

    if (channels.size < rules.maxChannels) return null;

    return createIncident("echo", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `El mismo texto se pegó en ${channels.size} canales`,
      details: { channels: [...channels] },
      recommendedActions: ["delete", "warn", "timeout"],
    });
  },
};

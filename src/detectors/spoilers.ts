import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const spoilerDetector: Detector = {
  type: "spoiler",
  inspect({ message, snapshot, config }: DetectorInput): Incident | null {
    const rules = config.spoilers;
    if (!rules.enabled || !message.guild) return null;

    const marks = message.content.match(/\|\|/g)?.length ?? 0;
    const pairs = Math.floor(marks / 2);
    if (pairs <= rules.maxSpoilers) return null;

    return createIncident("spoiler", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Demasiados spoilers (${pairs}/${rules.maxSpoilers})`,
      details: { spoilers: pairs },
      recommendedActions: ["delete", "warn"],
    });
  },
};

import type { Detector, DetectorInput, Incident } from "../types";
import { createIncident } from "./incident";

export const raidDetector: Detector = {
  type: "raid",
  inspect({ message, snapshot, config, uniqueUsersInChannel }: DetectorInput): Incident | null {
    const rules = config.raid;
    if (!rules.enabled || !message.guild) return null;
    if (uniqueUsersInChannel < rules.maxUsers) return null;

    return createIncident("raid", snapshot, {
      userId: message.author.id,
      guildId: message.guild.id,
      severity: rules.severity,
      reason: `Posible raid de canal (${uniqueUsersInChannel} usuarios en ${rules.windowMs}ms)`,
      details: { users: uniqueUsersInChannel, windowMs: rules.windowMs },
      recommendedActions: ["delete", "timeout"],
    });
  },
};

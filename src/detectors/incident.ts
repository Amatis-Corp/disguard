import type { DetectorType, Incident, MessageSnapshot, Severity } from "../types";

export function createIncident(
  type: DetectorType,
  snapshot: MessageSnapshot,
  input: {
    userId: string;
    guildId: string;
    severity: Severity;
    reason: string;
    details?: Record<string, unknown>;
    recommendedActions?: Incident["recommendedActions"];
  },
): Incident {
  return {
    type,
    severity: input.severity,
    userId: input.userId,
    guildId: input.guildId,
    channelId: snapshot.channelId,
    messageId: snapshot.id,
    reason: input.reason,
    details: input.details ?? {},
    recommendedActions: input.recommendedActions ?? ["delete", "warn"],
    timestamp: snapshot.timestamp,
  };
}

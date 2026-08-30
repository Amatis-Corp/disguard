import type { MessageSnapshot } from "../types";

interface UserBucket {
  messages: MessageSnapshot[];
  strikes: number;
  lastStrikeAt: number;
  lastActionAt: number;
}

interface ImageHit {
  hash: string;
  userId: string;
  timestamp: number;
}

export class MemoryStore {
  private readonly users = new Map<string, UserBucket>();
  private readonly images: ImageHit[] = [];

  userKey(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  private bucket(guildId: string, userId: string): UserBucket {
    const key = this.userKey(guildId, userId);
    let bucket = this.users.get(key);
    if (!bucket) {
      bucket = { messages: [], strikes: 0, lastStrikeAt: 0, lastActionAt: 0 };
      this.users.set(key, bucket);
    }
    return bucket;
  }

  pushMessage(guildId: string, userId: string, snapshot: MessageSnapshot, maxAgeMs: number): MessageSnapshot[] {
    const bucket = this.bucket(guildId, userId);
    bucket.messages.push(snapshot);
    this.pruneUser(bucket, snapshot.timestamp, maxAgeMs);
    return bucket.messages;
  }

  getHistory(guildId: string, userId: string, now: number, windowMs: number): MessageSnapshot[] {
    const bucket = this.users.get(this.userKey(guildId, userId));
    if (!bucket) return [];
    return bucket.messages.filter((item) => now - item.timestamp <= windowMs);
  }

  addImageHit(hash: string, userId: string, timestamp: number): void {
    this.images.push({ hash, userId, timestamp });
  }

  countImageHits(hash: string, now: number, windowMs: number, userId?: string): number {
    return this.images.filter((hit) => {
      if (now - hit.timestamp > windowMs) return false;
      if (hit.hash !== hash) return false;
      if (userId && hit.userId !== userId) return false;
      return true;
    }).length;
  }

  countDistinctUsersForImage(hash: string, now: number, windowMs: number): number {
    const users = new Set<string>();
    for (const hit of this.images) {
      if (now - hit.timestamp > windowMs) continue;
      if (hit.hash !== hash) continue;
      users.add(hit.userId);
    }
    return users.size;
  }

  addStrike(guildId: string, userId: string, now: number, decayMs: number): number {
    const bucket = this.bucket(guildId, userId);
    if (decayMs > 0 && bucket.lastStrikeAt > 0 && now - bucket.lastStrikeAt > decayMs) {
      bucket.strikes = 0;
    }
    bucket.strikes += 1;
    bucket.lastStrikeAt = now;
    return bucket.strikes;
  }

  getStrikes(guildId: string, userId: string, now: number, decayMs: number): number {
    const bucket = this.users.get(this.userKey(guildId, userId));
    if (!bucket) return 0;
    if (decayMs > 0 && bucket.lastStrikeAt > 0 && now - bucket.lastStrikeAt > decayMs) {
      return 0;
    }
    return bucket.strikes;
  }

  markAction(guildId: string, userId: string, now: number): void {
    this.bucket(guildId, userId).lastActionAt = now;
  }

  isCoolingDown(guildId: string, userId: string, now: number, cooldownMs: number): boolean {
    if (cooldownMs <= 0) return false;
    const bucket = this.users.get(this.userKey(guildId, userId));
    if (!bucket || bucket.lastActionAt <= 0) return false;
    return now - bucket.lastActionAt < cooldownMs;
  }

  resetUser(guildId: string, userId: string): void {
    this.users.delete(this.userKey(guildId, userId));
  }

  cleanup(now: number, maxAgeMs: number): void {
    for (const [key, bucket] of this.users) {
      this.pruneUser(bucket, now, maxAgeMs);
      const staleStrikes = bucket.lastStrikeAt > 0 && now - bucket.lastStrikeAt > maxAgeMs;
      const staleAction = bucket.lastActionAt <= 0 || now - bucket.lastActionAt > maxAgeMs;
      if (bucket.messages.length === 0 && (bucket.strikes === 0 || staleStrikes) && staleAction) {
        this.users.delete(key);
      }
    }

    for (let i = this.images.length - 1; i >= 0; i -= 1) {
      if (now - this.images[i].timestamp > maxAgeMs) {
        this.images.splice(i, 1);
      }
    }
  }

  private pruneUser(bucket: UserBucket, now: number, maxAgeMs: number): void {
    bucket.messages = bucket.messages.filter((item) => now - item.timestamp <= maxAgeMs);
  }
}

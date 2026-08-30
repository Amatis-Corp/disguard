import { PermissionFlagsBits, type Client, type Message } from "discord.js";

export function fakeClient(): Client {
  const listeners = new Map<string, Function[]>();
  return {
    on(event: string, fn: Function) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
      return this;
    },
    off(event: string, fn: Function) {
      const list = (listeners.get(event) ?? []).filter((item) => item !== fn);
      listeners.set(event, list);
      return this;
    },
  } as unknown as Client;
}

export function fakeMessage(overrides: Record<string, unknown> = {}): Message {
  const users = new Map<string, { id: string }>();
  const roles = new Map<string, { id: string }>();

  const message = {
    id: "msg-1",
    content: "hola",
    channelId: "channel-1",
    webhookId: null,
    author: { id: "user-1", bot: false },
    guild: { id: "guild-1", ownerId: "owner-1" },
    member: {
      id: "user-1",
      permissions: { has: (bit: bigint) => bit === PermissionFlagsBits.SendMessages },
      roles: { cache: new Map() },
    },
    mentions: { everyone: false, users, roles },
    attachments: new Map(),
    stickers: new Map(),
    embeds: [],
    channel: { parentId: null },
    ...overrides,
  };

  return message as unknown as Message;
}

import { describe, expect, it } from "vitest";
import { AntiSpam } from "../src/AntiSpam";
import { duplicateDetector } from "../src/detectors/duplicates";
import { floodDetector } from "../src/detectors/flood";
import { linkDetector } from "../src/detectors/links";
import { resolveConfig } from "../src/defaults";
import type { DetectorInput, MessageSnapshot } from "../src/types";
import { normalizeText } from "../src/utils/normalize";
import { fakeClient, fakeMessage } from "./helpers";

function snapshot(content: string, id = "1", timestamp = Date.now()): MessageSnapshot {
  return {
    id,
    channelId: "channel-1",
    content,
    normalized: normalizeText(content),
    timestamp,
    attachmentHashes: [],
  };
}

function input(partial: Partial<DetectorInput> & Pick<DetectorInput, "message" | "snapshot">): DetectorInput {
  return {
    history: [],
    config: resolveConfig("balanced"),
    now: Date.now(),
    ...partial,
  };
}

describe("floodDetector", () => {
  it("dispara al superar el máximo en la ventana", () => {
    const now = 1_000_000;
    const history = Array.from({ length: 5 }, (_, index) =>
      snapshot(`msg ${index}`, String(index), now - 200),
    );
    const incident = floodDetector.inspect(
      input({
        message: fakeMessage(),
        snapshot: history[4],
        history,
        now,
      }),
    );
    expect(incident?.type).toBe("flood");
  });

  it("no dispara por debajo del umbral", () => {
    const now = 1_000_000;
    const history = [snapshot("a", "1", now)];
    const incident = floodDetector.inspect(
      input({
        message: fakeMessage(),
        snapshot: history[0],
        history,
        now,
      }),
    );
    expect(incident).toBeNull();
  });
});

describe("duplicateDetector", () => {
  it("detecta el mismo texto repetido", () => {
    const now = 1_000_000;
    const current = snapshot("hola hola", "3", now);
    const history = [snapshot("hola hola", "1", now - 100), snapshot("hola hola", "2", now - 50), current];
    const incident = duplicateDetector.inspect(
      input({
        message: fakeMessage({ content: "hola hola" }),
        snapshot: current,
        history,
        now,
      }),
    );
    expect(incident?.type).toBe("duplicate");
  });
});

describe("linkDetector", () => {
  it("bloquea acortadores", () => {
    const content = "mira esto https://bit.ly/abc123";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.type).toBe("link");
    expect(incident?.reason).toMatch(/acortador/i);
  });

  it("permite dominios de la allowList", () => {
    const content = "https://youtube.com/watch?v=dQw4w9WgXcQ";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident).toBeNull();
  });

  it("marca phishing de nitro + enlace", () => {
    const content = "Free Nitro https://totally-legit.gift/claim";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.severity).toBe("critical");
  });

  it("respeta blockList personalizada", () => {
    const content = "https://spam.ejemplo/x";
    const config = resolveConfig("balanced", { links: { blockList: ["spam.ejemplo"] } });
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident?.reason).toMatch(/bloqueado/i);
  });
});

describe("AntiSpam", () => {
  it("ignora bots y roles configurados", () => {
    const antispam = new AntiSpam(fakeClient(), {
      ignored: { roles: ["staff"] },
    });

    expect(antispam.shouldIgnore(fakeMessage({ author: { id: "b", bot: true } }))).toBe(true);

    const staff = fakeMessage({
      member: {
        id: "user-1",
        permissions: { has: () => false },
        roles: { cache: new Map([["staff", { id: "staff" }]]) },
      },
    });
    expect(antispam.shouldIgnore(staff)).toBe(true);
  });

  it("aplica config por servidor", () => {
    const antispam = new AntiSpam(fakeClient());
    antispam.setGuildConfig("guild-1", { flood: { maxMessages: 2 } });
    expect(antispam.getGuildConfig("guild-1").flood.maxMessages).toBe(2);
    expect(antispam.getConfig().flood.maxMessages).toBe(5);
    antispam.clearGuildConfig("guild-1");
    expect(antispam.getGuildConfig("guild-1").flood.maxMessages).toBe(5);
  });

  it("detecta flood a través de analyze()", async () => {
    const antispam = new AntiSpam(fakeClient(), {
      flood: { maxMessages: 3, windowMs: 10_000 },
      duplicates: { enabled: false },
      links: { enabled: false },
      images: { enabled: false },
      mentions: { enabled: false },
      caps: { enabled: false },
      emojis: { enabled: false },
      files: { enabled: false },
      zalgo: { enabled: false },
      newlines: { enabled: false },
      accounts: { enabled: false },
      length: { enabled: false },
      words: { enabled: false },
      hop: { enabled: false },
      punctuation: { enabled: false },
      spoilers: { enabled: false },
      ghostPing: { enabled: false },
    });

    expect(await antispam.analyze(fakeMessage({ id: "1", content: "uno" }))).toBeNull();
    expect(await antispam.analyze(fakeMessage({ id: "2", content: "dos" }))).toBeNull();
    const third = await antispam.analyze(fakeMessage({ id: "3", content: "tres" }));
    expect(third?.type).toBe("flood");
  });
});

describe("file / zalgo / newline", () => {
  it("bloquea adjuntos peligrosos", async () => {
    const { fileDetector } = await import("../src/detectors/files");
    const attachments = new Map([
      ["1", { name: "setup.exe", size: 1200, contentType: "application/octet-stream" }],
    ]);
    const incident = fileDetector.inspect(
      input({
        message: fakeMessage({ attachments }),
        snapshot: snapshot(""),
      }),
    );
    expect(incident?.type).toBe("file");
  });

  it("detecta zalgo", async () => {
    const { zalgoDetector } = await import("../src/detectors/zalgo");
    const content = "h" + "\u0301".repeat(30) + "ola";
    const incident = zalgoDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.type).toBe("zalgo");
  });

  it("detecta saltos de línea excesivos", async () => {
    const { newlineDetector } = await import("../src/detectors/newlines");
    const content = `${"linea\n".repeat(20)}fin`;
    const incident = newlineDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.type).toBe("newline");
  });
});

describe("links in embeds", () => {
  it("caza acortadores dentro de un embed", () => {
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({
          content: "",
          embeds: [{ description: "click https://bit.ly/hidden", fields: [], footer: null, author: null }],
        }),
        snapshot: snapshot(""),
      }),
    );
    expect(incident?.type).toBe("link");
  });
});

describe("1.2.0 options", () => {
  it("respeta disabledDetectors", async () => {
    const antispam = new AntiSpam(fakeClient(), {
      flood: { maxMessages: 1, windowMs: 10_000 },
      disabledDetectors: ["flood"],
      duplicates: { enabled: false },
      links: { enabled: false },
      images: { enabled: false },
      mentions: { enabled: false },
      caps: { enabled: false },
      emojis: { enabled: false },
      files: { enabled: false },
      zalgo: { enabled: false },
      newlines: { enabled: false },
      accounts: { enabled: false },
      length: { enabled: false },
      words: { enabled: false },
      hop: { enabled: false },
      punctuation: { enabled: false },
      spoilers: { enabled: false },
      ghostPing: { enabled: false },
    });
    expect(await antispam.analyze(fakeMessage({ id: "x", content: "solo" }))).toBeNull();
  });

  it("aplica override por canal", () => {
    const antispam = new AntiSpam(fakeClient());
    antispam.setChannelConfig("guild-1", "channel-1", { flood: { maxMessages: 2 } });
    expect(antispam.getChannelConfig("guild-1", "channel-1").flood.maxMessages).toBe(2);
    expect(antispam.getConfig().flood.maxMessages).toBe(5);
  });

  it("limita enlaces por mensaje", () => {
    const config = resolveConfig("balanced", { links: { maxLinks: 1 } });
    const content = "https://evil.test/a https://otro.test/b";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident?.reason).toMatch(/enlaces/i);
  });

  it("detecta cuentas nuevas", async () => {
    const { accountDetector } = await import("../src/detectors/accounts");
    const config = resolveConfig("balanced", { accounts: { enabled: true, minAgeDays: 30 } });
    const incident = accountDetector.inspect(
      input({
        message: fakeMessage({
          author: { id: "user-1", bot: false, createdTimestamp: Date.now() - 60 * 60 * 1000, avatar: "abc" },
        }),
        snapshot: snapshot("hola"),
        config,
        now: Date.now(),
      }),
    );
    expect(incident?.type).toBe("account");
  });
});

describe("cooldown store", () => {
  it("marca cooldown tras un castigo", () => {
    const antispam = new AntiSpam(fakeClient(), { punishment: { cooldownMs: 10_000 } });
    expect(antispam.isCoolingDown("guild-1", "user-1")).toBe(false);
    antispam.store.markAction("guild-1", "user-1", Date.now());
    expect(antispam.isCoolingDown("guild-1", "user-1")).toBe(true);
  });
});

describe("1.3.0 detectors", () => {
  it("bloquea palabras de la lista", async () => {
    const { wordDetector } = await import("../src/detectors/words");
    const config = resolveConfig("balanced", {
      words: { enabled: true, list: ["raid-now"], matchWholeWord: true, ignoreCase: true },
    });
    const content = "vamos raid-now ya";
    const incident = wordDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident?.type).toBe("word");
    expect(incident?.details).toMatchObject({ word: "raid-now" });
  });

  it("respeta matchWholeWord", async () => {
    const { wordDetector } = await import("../src/detectors/words");
    const config = resolveConfig("balanced", {
      words: { enabled: true, list: ["raid"], matchWholeWord: true },
    });
    const content = "braiding the rope";
    const incident = wordDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident).toBeNull();
  });

  it("detecta salto de canales", async () => {
    const { hopDetector } = await import("../src/detectors/hop");
    const now = 1_000_000;
    const history = ["c1", "c2", "c3", "c4", "c5"].map((channelId, index) => ({
      ...snapshot(`msg ${index}`, String(index), now - 100),
      channelId,
    }));
    const incident = hopDetector.inspect(
      input({
        message: fakeMessage({ channelId: "c5" }),
        snapshot: history[4],
        history,
        now,
        config: resolveConfig("balanced", { hop: { maxChannels: 5, windowMs: 8_000 } }),
      }),
    );
    expect(incident?.type).toBe("hop");
  });

  it("detecta caracteres repetidos", async () => {
    const { punctuationDetector } = await import("../src/detectors/punctuation");
    const content = "aaaaaaaaaaa";
    const incident = punctuationDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.type).toBe("punctuation");
  });

  it("detecta demasiados spoilers", async () => {
    const { spoilerDetector } = await import("../src/detectors/spoilers");
    const content = "||a||||b||||c||||d||||e||||f||||g||||h||||i||";
    const incident = spoilerDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
      }),
    );
    expect(incident?.type).toBe("spoiler");
  });

  it("detecta ghost ping al borrar", async () => {
    const { inspectGhostPing } = await import("../src/detectors/ghost");
    const users = new Map([["victim", { id: "victim" }]]);
    const incident = inspectGhostPing(
      fakeMessage({
        mentions: { everyone: false, users, roles: new Map() },
        createdTimestamp: Date.now() - 1_000,
      }),
      { enabled: true, minMentions: 1, maxAgeMs: 15_000, severity: "high" },
      Date.now(),
    );
    expect(incident?.type).toBe("ghost");
  });

  it("bloquea enlaces oauth fuera de la allowList", () => {
    const config = resolveConfig("balanced", { links: { blockOauth: true } });
    const content = "https://evil.test/oauth/authorize?client_id=1";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident?.type).toBe("link");
    expect(incident?.reason).toMatch(/oauth|login/i);
  });

  it("permite oauth en discord.com por allowList", () => {
    const config = resolveConfig("balanced", { links: { detectPhishingKeywords: false } });
    const content = "https://discord.com/oauth2/authorize?client_id=1";
    const incident = linkDetector.inspect(
      input({
        message: fakeMessage({ content }),
        snapshot: snapshot(content),
        config,
      }),
    );
    expect(incident).toBeNull();
  });

  it("limita el tamaño de adjuntos", async () => {
    const { fileDetector } = await import("../src/detectors/files");
    const config = resolveConfig("balanced", { files: { maxBytes: 100 } });
    const attachments = new Map([
      ["1", { name: "foto.png", size: 500, contentType: "image/png" }],
    ]);
    const incident = fileDetector.inspect(
      input({
        message: fakeMessage({ attachments }),
        snapshot: snapshot(""),
        config,
      }),
    );
    expect(incident?.type).toBe("file");
    expect(incident?.reason).toMatch(/grande/i);
  });

  it("detecta miembros nuevos en el servidor", async () => {
    const { accountDetector } = await import("../src/detectors/accounts");
    const now = Date.now();
    const config = resolveConfig("balanced", {
      accounts: { enabled: true, minAgeDays: 0, minGuildAgeDays: 7, blockDefaultAvatar: false },
    });
    const incident = accountDetector.inspect(
      input({
        message: fakeMessage({
          author: { id: "user-1", bot: false, createdTimestamp: now - 400 * 24 * 60 * 60 * 1000, avatar: "abc" },
          member: {
            id: "user-1",
            joinedTimestamp: now - 60 * 60 * 1000,
            permissions: { has: () => false },
            roles: { cache: new Map() },
          },
        }),
        snapshot: snapshot("hola"),
        config,
        now,
      }),
    );
    expect(incident?.type).toBe("account");
    expect(incident?.reason).toMatch(/servidor/i);
  });
});

describe("1.3.0 AntiSpam", () => {
  it("ignora prefijos de comando", () => {
    const antispam = new AntiSpam(fakeClient(), { ignored: { prefixes: ["!", "/"] } });
    expect(antispam.shouldIgnore(fakeMessage({ content: "!help" }))).toBe(true);
    expect(antispam.shouldIgnore(fakeMessage({ content: "hola" }))).toBe(false);
  });

  it("pausa y reanuda la aplicación", () => {
    const antispam = new AntiSpam(fakeClient());
    expect(antispam.isPaused()).toBe(false);
    antispam.pause();
    expect(antispam.isPaused()).toBe(true);
    antispam.resume();
    expect(antispam.isPaused()).toBe(false);
  });

  it("aplica override por rol", () => {
    const antispam = new AntiSpam(fakeClient());
    antispam.setRoleConfig("vip", { flood: { maxMessages: 20 } });
    const vip = fakeMessage({
      member: {
        id: "user-1",
        permissions: { has: () => false },
        roles: { cache: new Map([["vip", { id: "vip" }]]) },
      },
    });
    expect(antispam.shouldIgnore(vip)).toBe(false);
    expect(antispam.getConfig().roleOverrides.vip?.flood?.maxMessages).toBe(20);
  });
});

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

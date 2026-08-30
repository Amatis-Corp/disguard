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

  it("detecta flood a través de analyze()", async () => {
    const antispam = new AntiSpam(fakeClient(), {
      flood: { maxMessages: 3, windowMs: 10_000 },
      duplicates: { enabled: false },
      links: { enabled: false },
      images: { enabled: false },
      mentions: { enabled: false },
      caps: { enabled: false },
      emojis: { enabled: false },
    });

    expect(await antispam.analyze(fakeMessage({ id: "1", content: "uno" }))).toBeNull();
    expect(await antispam.analyze(fakeMessage({ id: "2", content: "dos" }))).toBeNull();
    const third = await antispam.analyze(fakeMessage({ id: "3", content: "tres" }));
    expect(third?.type).toBe("flood");
  });
});

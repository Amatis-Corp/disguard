import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeDeep, resolveConfig } from "../src/defaults";
import { timeoutDuration } from "../src/enforcement";
import { resolveWarnMessage } from "../src/locale";

describe("resolveConfig", () => {
  it("parte de balanced por defecto", () => {
    const config = resolveConfig(undefined, {});
    expect(config.flood.maxMessages).toBe(DEFAULT_CONFIG.flood.maxMessages);
    expect(config.enabled).toBe(true);
  });

  it("aplica preset strict y overrides del desarrollador", () => {
    const config = resolveConfig("strict", {
      flood: { maxMessages: 2 },
      links: { blockList: ["evil.test"] },
    });
    expect(config.flood.maxMessages).toBe(2);
    expect(config.links.blockInvites).toBe(true);
    expect(config.links.blockList).toEqual(["evil.test"]);
    expect(config.links.blockShorteners).toBe(true);
  });
});

describe("timeout scale", () => {
  it("escala linear y respeta el tope", () => {
    const config = resolveConfig("balanced", {
      punishment: { timeout: { durationMs: 60_000, scale: "linear", maxDurationMs: 180_000 } },
    });
    expect(timeoutDuration(config, 1)).toBe(60_000);
    expect(timeoutDuration(config, 2)).toBe(120_000);
    expect(timeoutDuration(config, 4)).toBe(180_000);
  });
});

describe("locale", () => {
  it("usa la plantilla en inglés si warnMessage está vacío", () => {
    expect(resolveWarnMessage("en", "")).toMatch(/blocked/i);
    expect(resolveWarnMessage("es", "")).toMatch(/bloqueado/i);
    expect(resolveWarnMessage("en", "custom {reason}")).toBe("custom {reason}");
  });
});

describe("mergeDeep", () => {
  it("no pisa ramas no tocadas", () => {
    const merged = mergeDeep(DEFAULT_CONFIG, { images: { hashMode: "content" } });
    expect(merged.images.hashMode).toBe("content");
    expect(merged.images.maxRepeats).toBe(DEFAULT_CONFIG.images.maxRepeats);
    expect(merged.flood.maxMessages).toBe(DEFAULT_CONFIG.flood.maxMessages);
  });
});

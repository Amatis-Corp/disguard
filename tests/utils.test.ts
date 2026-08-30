import { describe, expect, it } from "vitest";
import { normalizeText } from "../src/utils/normalize";
import { similarity } from "../src/utils/similarity";
import {
  brandLookalike,
  extractUrls,
  messageHasPhishingKeywords,
} from "../src/utils/urls";

describe("normalizeText", () => {
  it("quita markdown, urls y unifica mayúsculas", () => {
    expect(normalizeText("**Hola!!** https://x.com")).toBe("hola");
  });

  it("colapsa espacios y caracteres invisibles", () => {
    expect(normalizeText("hola\u200b   mundo")).toBe("hola mundo");
  });
});

describe("similarity", () => {
  it("detecta textos casi iguales", () => {
    expect(similarity("hola mundo", "hola mundo")).toBe(1);
    expect(similarity("hola mundo", "hola mundoo")).toBeGreaterThan(0.8);
  });
});

describe("extractUrls", () => {
  it("extrae urls, invitaciones y enlaces markdown", () => {
    const urls = extractUrls("mira https://evil.test/x y [x](https://otro.test) discord.gg/abc");
    expect(urls.map((item) => item.hostname)).toEqual(
      expect.arrayContaining(["evil.test", "otro.test", "discord.gg"]),
    );
    expect(urls.some((item) => item.isInvite)).toBe(true);
  });

  it("marca IPs y punycode", () => {
    const [ip] = extractUrls("http://8.8.8.8/login");
    expect(ip.isIp).toBe(true);
    const [puny] = extractUrls("https://xn--discrd-2wa.com");
    expect(puny.isPunycode).toBe(true);
  });
});

describe("phishing heuristics", () => {
  it("detecta clones de marcas", () => {
    expect(brandLookalike("dlscord.com")).toBe("discord");
    expect(brandLookalike("discord.com")).toBeNull();
    expect(brandLookalike("steamcommunnity.com")).toBe("steam");
  });

  it("detecta palabras típicas de estafa", () => {
    expect(messageHasPhishingKeywords("Free Nitro click here")).toBe("free nitro");
    expect(messageHasPhishingKeywords("buenos dias")).toBeNull();
  });
});

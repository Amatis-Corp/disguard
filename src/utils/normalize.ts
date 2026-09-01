const ZALGO = /[\u0300-\u036f\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;
const MARKDOWN = /[`*_~|]+/g;
const SPOILER = /\|\|/g;

export function stripZalgo(text: string): string {
  return text.normalize("NFKD").replace(ZALGO, "");
}

export function normalizeText(text: string): string {
  return stripZalgo(text)
    .replace(INVISIBLE, "")
    .replace(SPOILER, "")
    .replace(MARKDOWN, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/<a?:[\w~]+:\d+>/g, "")
    .replace(/<[@#&!]\d+>/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lettersOnly(text: string): string {
  return stripZalgo(text).replace(/[^\p{L}]/gu, "");
}

export function countEmojis(text: string): number {
  const custom = text.match(/<a?:[\w~]+:\d+>/g)?.length ?? 0;
  const unicode = text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  return custom + unicode;
}

export function countZalgo(text: string): number {
  return text.normalize("NFKD").match(ZALGO)?.length ?? 0;
}

export function countInvisible(text: string): number {
  return text.match(INVISIBLE)?.length ?? 0;
}

export function countNewlines(text: string): number {
  return (text.match(/\n/g) ?? []).length;
}

import { createHash } from "node:crypto";

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function metaAttachmentHash(input: {
  name?: string | null;
  size?: number | null;
  contentType?: string | null;
  url?: string | null;
}): string {
  const name = (input.name ?? "unknown").toLowerCase().trim();
  const size = input.size ?? 0;
  const type = (input.contentType ?? "application/octet-stream").toLowerCase();
  return sha256(`meta:${size}:${type}:${name}`);
}

export async function contentHashFromUrl(
  url: string,
  maxBytes: number,
): Promise<string | null> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "@amatiscorp/disguard/1.0" },
  });
  if (!response.ok || !response.body) return null;

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return sha256(Buffer.concat(chunks));
}

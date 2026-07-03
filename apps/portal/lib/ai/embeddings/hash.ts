import crypto from "crypto";

export function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function computeHashes(texts: string[]): string[] {
  return texts.map(computeHash);
}

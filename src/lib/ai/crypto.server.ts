import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM. The key is derived from the server-only PROVIDER_KEYS_ENCRYPTION_SECRET.
function key(): Buffer {
  const raw = process.env["PROVIDER_KEYS_ENCRYPTION_SECRET"];
  if (!raw) throw new Error("Encryption secret is not configured on the server.");
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export function keyHint(plaintext: string): string {
  const trimmed = plaintext.trim();
  return trimmed.length <= 8 ? "••••" : `••••${trimmed.slice(-4)}`;
}

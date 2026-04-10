import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypt a string with AES-256-CBC.
 * Returns iv:ciphertext as hex string.
 * No-ops (returns plaintext) if ENCRYPTION_KEY is not set (dev mode).
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text;
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt an AES-256-CBC encrypted string.
 * Expects iv:ciphertext format.
 * If no colon found (unencrypted), returns as-is (backward compat).
 */
export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text;
  if (!text.includes(":")) return text; // Unencrypted legacy value
  const [ivHex, encryptedHex] = text.split(":");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(ivHex, "hex"),
  );
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

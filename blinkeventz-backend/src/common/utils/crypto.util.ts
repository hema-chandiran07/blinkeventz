import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// AES-256-CBC Encryption Utility
// Key must be a 64-char hex string (32 bytes) from ENV
// ─────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.DATA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'DATA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-CBC.
 * Returns `iv:ciphertext` in hex format.
 * Each call produces a unique ciphertext due to random IV.
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt AES-256-CBC ciphertext.
 * Expects `iv:ciphertext` hex format.
 */
export function decrypt(data: string): string {
  const key = getEncryptionKey();
  const separatorIndex = data.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error('Invalid encrypted data format — expected iv:ciphertext');
  }

  const ivHex = data.substring(0, separatorIndex);
  const encrypted = data.substring(separatorIndex + 1);
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Deterministic SHA-256 hash.
 * Used for duplicate detection (e.g., bank account numbers).
 * Same input always produces the same hash.
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Mask sensitive values for API responses.
 * Shows only the last 4 characters.
 * e.g., "1234567890" → "XXXXXX7890"
 */
export function mask(value: string): string {
  if (!value || value.length <= 4) return '****';
  return 'X'.repeat(value.length - 4) + value.slice(-4);
}

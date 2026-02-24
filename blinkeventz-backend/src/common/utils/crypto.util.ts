import * as crypto from 'crypto';

const KEY = Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(data: string): string {
  const [ivHex, encrypted] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function mask(value: string): string {
  if (value.length <= 4) return value;
  return 'XXXXXX' + value.slice(-4);
}
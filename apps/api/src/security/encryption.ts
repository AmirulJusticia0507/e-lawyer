import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'elawyer:v1:';

function keyBytes(secret: string): Buffer {
  if (!secret || secret.startsWith('changeme'))
    throw new Error('ENCRYPTION_KEY wajib dikonfigurasi');
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptBuffer(value: Buffer, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([Buffer.from(PREFIX), iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBuffer(value: Buffer, secret: string): Buffer {
  const prefix = Buffer.from(PREFIX);
  if (!value.subarray(0, prefix.length).equals(prefix)) return value;
  const ivStart = prefix.length;
  const tagStart = ivStart + 12;
  const dataStart = tagStart + 16;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyBytes(secret),
    value.subarray(ivStart, tagStart),
  );
  decipher.setAuthTag(value.subarray(tagStart, dataStart));
  return Buffer.concat([decipher.update(value.subarray(dataStart)), decipher.final()]);
}

export function encryptText(value: string, secret: string): string {
  return encryptBuffer(Buffer.from(value, 'utf8'), secret).toString('base64');
}

export function decryptText(value: string, secret: string): string {
  try {
    const decoded = Buffer.from(value, 'base64');
    if (!decoded.subarray(0, PREFIX.length).equals(Buffer.from(PREFIX))) return value;
    return decryptBuffer(decoded, secret).toString('utf8');
  } catch {
    return value;
  }
}

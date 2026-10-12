import { readFileSync } from 'node:fs';

const SECRET_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'OAUTH_CLIENT_SECRET',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'ENCRYPTION_KEY',
  'AI_API_KEY',
  'ESIGN_API_KEY',
  'EMETERAI_API_KEY',
  'PAYMENT_SERVER_KEY',
  'SMTP_URL',
  'WHATSAPP_API_KEY',
  'PUSH_PROVIDER_KEY',
  'VIDEO_API_KEY',
] as const;

export function resolveSecretFiles(config: Record<string, unknown>): Record<string, unknown> {
  const resolved = { ...config };

  for (const key of SECRET_KEYS) {
    const fileKey = `${key}_FILE`;
    const filePath = config[fileKey];

    if (typeof filePath !== 'string' || filePath.trim() === '') continue;
    if (typeof config[key] === 'string' && config[key] !== '') {
      throw new Error(`Gunakan salah satu ${key} atau ${fileKey}, bukan keduanya`);
    }

    let value: string;
    try {
      value = readFileSync(filePath, 'utf8').trim();
    } catch {
      throw new Error(`Secret ${key} tidak dapat dibaca dari ${filePath}`);
    }

    if (!value) throw new Error(`Secret ${key} di ${filePath} kosong`);
    resolved[key] = value;
  }

  return resolved;
}

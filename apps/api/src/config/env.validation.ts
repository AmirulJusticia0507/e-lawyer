import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { resolveSecretFiles } from './secret-files';

enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_URL = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = '';

  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  TRUST_PROXY_HOPS = 0;

  @IsString()
  @IsOptional()
  WEB_URL = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  SMTP_URL = '';

  @IsString()
  @IsOptional()
  SMTP_FROM = 'e-Lawyer <no-reply@elawyer.local>';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  DATABASE_URL_UNPOOLED?: string;

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  ENCRYPTION_KEY?: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  ENCRYPTION_KEY_PREVIOUS?: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  DOCUMENT_ENCRYPTION_KEY?: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  DOCUMENT_ENCRYPTION_KEY_PREVIOUS?: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  FILE_ENCRYPTION_KEY?: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  FILE_ENCRYPTION_KEY_PREVIOUS?: string;

  @IsString()
  @IsOptional()
  AI_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_BASE_URL = 'https://griphubrouter.web.id/v1';

  @IsString()
  @IsOptional()
  AI_MODEL = '';

  @IsString()
  @IsOptional()
  DAILY_API_KEY?: string;

  @IsString()
  @IsOptional()
  DAILY_BASE_URL = 'https://api.daily.co';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  @Matches(/^\d+[smhd]$/)
  @IsOptional()
  JWT_SESSION_MAX_AGE = '30d';

  @IsInt()
  @Min(4)
  @Max(15)
  @IsOptional()
  BCRYPT_ROUNDS: number = 12;

  @IsString()
  @IsOptional()
  TSA_URL = '';

  @IsString()
  @IsOptional()
  HCAPTCHA_SITE_KEY = '';

  @IsString()
  @IsOptional()
  HCAPTCHA_SECRET_KEY = '';

  @IsString()
  @IsOptional()
  CAP_SECRET_KEY = '';

  @IsString()
  @IsOptional()
  CAP_VERIFY_URL = '';

  @IsString()
  @IsOptional()
  RECAPTCHA_SECRET_KEY = '';

  @IsString()
  @IsOptional()
  CAPTCHA_ENABLED = 'true';

  @IsString()
  @IsOptional()
  INTEGRITY_HASH_ALGO = 'sha256';
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const resolvedConfig = resolveSecretFiles(config);
  const validated = plainToInstance(EnvironmentVariables, resolvedConfig, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Konfigurasi environment tidak valid:\n${errors.toString()}`);
  }
  if (validated.NODE_ENV === Environment.Production) {
    const weakSecret = (value?: string) =>
      !value || value.length < 32 || value.startsWith('changeme');
    if (weakSecret(validated.JWT_ACCESS_SECRET) || weakSecret(validated.JWT_REFRESH_SECRET)) {
      throw new Error('JWT secret production wajib unik dan minimal 32 karakter');
    }
    if (weakSecret(validated.ENCRYPTION_KEY)) {
      throw new Error('ENCRYPTION_KEY production wajib unik dan minimal 32 karakter');
    }
    if (!validated.CORS_ORIGINS) {
      throw new Error('CORS_ORIGINS wajib dikonfigurasi pada production');
    }
  }
  // Return plain object, not class instance
  return JSON.parse(JSON.stringify(validated));
}

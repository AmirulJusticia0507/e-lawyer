import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
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
  INTEGRITY_HASH_ALGO = 'sha256';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const resolvedConfig = resolveSecretFiles(config);
  const validated = plainToInstance(EnvironmentVariables, resolvedConfig, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Konfigurasi environment tidak valid:\n${errors.toString()}`);
  }
  return validated;
}

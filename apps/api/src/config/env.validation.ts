import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';
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
  APP_PORT = 3000;

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
  DATABASE_URL!: string;

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
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsInt()
  @Min(4)
  @Max(15)
  @IsOptional()
  BCRYPT_ROUNDS = 12;
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

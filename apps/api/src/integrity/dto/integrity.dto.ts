import { AnomalyStatus, IntegrityEntityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export class CreateIntegrityRecordDto {
  @IsEnum(IntegrityEntityType)
  entityType!: IntegrityEntityType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsString()
  @Matches(SHA256_PATTERN, { message: 'sha256 harus 64 karakter hex' })
  sha256!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  claimedAt?: string;
}

export class VerifyIntegrityDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateAddendumDto {
  @IsUUID()
  recordId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;
}

export class CreateReceiptDto {
  @IsUUID()
  recordId!: string;

  @IsUUID()
  recipientPartyId!: string;
}

export class ConfirmReceiptDto {
  @IsUUID()
  receiptId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class DisputeReceiptDto {
  @IsUUID()
  receiptId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note!: string;
}

export class CreateDeadlineDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  label!: string;

  @IsISO8601()
  dueAt!: string;
}

export class ExtendDeadlineDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @IsISO8601()
  dueAt!: string;
}

export class CompleteDeadlineDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ResolveAnomalyDto {
  @IsEnum(AnomalyStatus)
  status!: AnomalyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class QueryAnomalyDto {
  @IsOptional()
  @IsEnum(AnomalyStatus)
  status?: AnomalyStatus;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CaseStatus, Jurisdiction } from '@prisma/client';
import { CreatePartyDto } from './party.dto';

export class CreateCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  caseNumber?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  courtName?: string;

  @IsEnum(Jurisdiction)
  @IsOptional()
  jurisdiction?: Jurisdiction;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caseType?: string;

  @IsOptional()
  @IsDateString()
  filedAt?: string;

  @IsOptional()
  parties?: CreatePartyDto[];
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  courtName?: string;

  @IsEnum(Jurisdiction)
  @IsOptional()
  jurisdiction?: Jurisdiction;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  caseType?: string;

  @IsOptional()
  @IsDateString()
  filedAt?: string;
}

export class QueryCaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @IsEnum(Jurisdiction)
  @IsOptional()
  jurisdiction?: Jurisdiction;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}

export class ChangeStatusDto {
  @IsEnum(CaseStatus)
  status!: CaseStatus;
}

export class AssignCaseDto {
  @IsUUID()
  toUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
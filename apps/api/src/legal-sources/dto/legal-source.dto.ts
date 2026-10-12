import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Jurisdiction, LegalSourceStatus, RegulationType } from '@prisma/client';

export class PaginationQueryDto {
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
}

export class QueryRegulationDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsEnum(RegulationType)
  @IsOptional()
  type?: RegulationType;

  @IsEnum(LegalSourceStatus)
  @IsOptional()
  status?: LegalSourceStatus;

  @IsEnum(Jurisdiction)
  @IsOptional()
  jurisdiction?: Jurisdiction;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2200)
  year?: number;

  @IsOptional()
  @IsDateString()
  at?: string;
}

export class QueryArticleDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsEnum(RegulationType)
  @IsOptional()
  type?: RegulationType;

  @IsEnum(LegalSourceStatus)
  @IsOptional()
  status?: LegalSourceStatus;

  @IsEnum(Jurisdiction)
  @IsOptional()
  jurisdiction?: Jurisdiction;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  regulationSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  articleNumber?: string;

  @IsOptional()
  @IsDateString()
  at?: string;
}

export class QueryArticleInRegulationDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LegalSourceStatus)
  status?: LegalSourceStatus;

  @IsOptional()
  @IsDateString()
  at?: string;
}

export class LookupArticleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  regulationSlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  articleNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  paragraphNumber?: string;

  @IsOptional()
  @IsDateString()
  at?: string;
}
import { FeeSchemeType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class QueryTimeEntryDto {
  @IsOptional() @IsUUID() caseId?: string;
  @IsOptional() @IsUUID() userId?: string;
}

export class StartTimerDto {
  @IsUUID() caseId!: string;
  @IsString() @Length(1, 500) description!: string;
  @IsOptional() @IsBoolean() billable?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) hourlyRate?: number;
}

export class CreateManualTimeEntryDto extends StartTimerDto {
  @IsDateString() startedAt!: string;
  @IsDateString() endedAt!: string;
}

export class QueryFeeSchemeDto {
  @IsOptional() @IsUUID() caseId?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsEnum(FeeSchemeType) type?: FeeSchemeType;
}

export class CreateFeeSchemeDto {
  @IsOptional() @IsUUID() caseId?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsEnum(FeeSchemeType) type!: FeeSchemeType;
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ValidateIf((value: CreateFeeSchemeDto) => value.amount !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
  @ValidateIf((value: CreateFeeSchemeDto) => value.hourlyRate !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
  @ValidateIf((value: CreateFeeSchemeDto) => value.successPercentage !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  successPercentage?: number;
}

import {
  IsArray,
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
import { FeeSchemeType } from '@prisma/client';
import { Type } from 'class-transformer';

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

export class CreateManualTimeEntryDto {
  @IsUUID() caseId!: string;
  @IsString() description!: string;
  @IsBoolean() billable!: boolean;
  @IsNumber() hourlyRate!: number;
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

export class CreatePaymentDto {
  @IsUUID() invoiceId!: string;
  @IsString() method!: string;
  @IsNumber() amount!: number;
  @IsString() reference?: string;
}

export class ProcessPaymentDto {
  @IsDateString() paidAt!: string;
}

export class CreateInvoiceDto {
  @IsUUID() caseId?: string;
  @IsUUID() clientId?: string;
  @IsArray() items!: any[];
  @IsNumber() subtotal?: number;
  @IsNumber() taxRate?: number;
}
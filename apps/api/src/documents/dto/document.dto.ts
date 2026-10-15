import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DocumentStatus,
  DocumentType,
  Jurisdiction,
  JudgmentVerdict,
  PowerOfAttorneyType,
} from '@prisma/client';

export class QueryDocumentsDto {
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsEnum(Jurisdiction)
  jurisdiction!: Jurisdiction;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  content?: string;

  @IsOptional()
  @IsObject()
  structure?: Record<string, unknown>;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  content?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;
}

export class CreatePowerOfAttorneyDto {
  @IsEnum(PowerOfAttorneyType)
  type!: PowerOfAttorneyType;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  principalName!: string;

  @IsOptional()
  @Matches(/^\d{16}$/)
  principalNik?: string;

  @IsOptional()
  @Matches(/^[\d.-]{15,25}$/)
  principalNpwp?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  attorneyName!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9.\-/ ]{4,39}$/)
  attorneyLicenseNo!: string;

  @IsOptional()
  @Matches(/^[\d.-]{15,25}$/)
  attorneyNpwp?: string;

  @IsOptional()
  @IsObject()
  authority?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class JudgmentInputDto {
  @IsEnum(JudgmentVerdict)
  verdict!: JudgmentVerdict;

  @IsOptional()
  @IsObject()
  header?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  partyIdentities?: Record<string, unknown>;

  @IsString()
  @MinLength(10)
  @MaxLength(12000)
  caseSummary!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(12000)
  considerations!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(12000)
  disposition!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  closing!: string;
}

export class CreateDocumentDto {
  @IsUUID()
  caseId!: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  content?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePowerOfAttorneyDto)
  @IsObject()
  powerOfAttorney?: CreatePowerOfAttorneyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => JudgmentInputDto)
  @IsObject()
  judgment?: JudgmentInputDto;
}

export class CreateSignatureDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  signerName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  signerRole!: string;

  @IsOptional()
  @IsEmail()
  signerEmail?: string;
}

export class GenerateAiDraftDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @MinLength(3)
  @MaxLength(3000)
  instruction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  sourceText?: string;
}

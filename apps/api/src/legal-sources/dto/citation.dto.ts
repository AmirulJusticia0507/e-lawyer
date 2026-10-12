import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CitationDocumentType } from '@prisma/client';

export class CreateCitationDto {
  @IsUUID()
  articleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  quote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;

  @IsEnum(CitationDocumentType)
  @IsOptional()
  documentType?: CitationDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  documentTitle?: string;

  @IsOptional()
  @IsDateString()
  at?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
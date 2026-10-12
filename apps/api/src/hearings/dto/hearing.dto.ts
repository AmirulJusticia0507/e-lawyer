import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { HearingStatus } from '@prisma/client';

export class CreateHearingDto {
  @IsUUID()
  caseId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  courtroom!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  judgeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class QueryHearingsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsEnum(HearingStatus)
  status?: HearingStatus;
}

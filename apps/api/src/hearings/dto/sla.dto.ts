import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { HearingStage, PostponementStatus, ReminderType } from '@prisma/client';

export class CreatePostponementDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsDateString()
  newStartsAt?: string;

  @IsOptional()
  @IsDateString()
  newEndsAt?: string;
}

export class ProcessPostponementDto {
  @IsEnum(PostponementStatus)
  decision!: PostponementStatus.APPROVED | PostponementStatus.REJECTED;
}

export class AdvanceStageDto {
  @IsEnum(HearingStage)
  stage!: HearingStage;
}

export class QuerySlaDto {
  @IsOptional()
  @IsUUID()
  hearingId?: string;
}

export class QueryReminderDto {
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;
}

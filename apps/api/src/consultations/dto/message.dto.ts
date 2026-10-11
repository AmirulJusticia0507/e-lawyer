import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, VideoSessionStatus } from '@prisma/client';

export class CreateMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  // Isi pesan (mode belum terenkripsi). Untuk E2EE, gunakan field ciphertext/iv/algorithm.
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  ciphertext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  iv?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  algorithm?: string;
}

export class CreateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  sizeBytes!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sha256!: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;
}

export class CreateVideoSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;
}

export class UpdateVideoSessionStatusDto {
  @IsEnum(VideoSessionStatus)
  status!: VideoSessionStatus;
}

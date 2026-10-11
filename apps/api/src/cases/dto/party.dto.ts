import { IsEmail, IsEnum, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ClientType, PartySide } from '@prisma/client';

export class CreatePartyDto {
  @IsEnum(PartySide)
  side!: PartySide;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsEnum(ClientType)
  @IsOptional()
  type?: ClientType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus 16 digit angka' })
  nik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npwp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePartyDto {
  @IsEnum(PartySide)
  @IsOptional()
  side?: PartySide;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsEnum(ClientType)
  @IsOptional()
  type?: ClientType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus 16 digit angka' })
  nik?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npwp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
import { IsEmail, IsString, MinLength, IsInt, IsOptional } from 'class-validator';

export class SsoLoginDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password!: string;

  @IsString()
  challengeId!: string;

  @IsInt()
  answer!: number;
}
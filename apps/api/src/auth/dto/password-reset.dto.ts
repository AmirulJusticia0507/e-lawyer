import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf dan angka',
  })
  password!: string;
}

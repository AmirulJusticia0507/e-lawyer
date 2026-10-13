import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthMailService } from './auth-mail.service';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { HCaptchaService } from './hcaptcha.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthMailService, CaptchaService, HCaptchaService, TokenService, JwtStrategy],
  exports: [AuthService, TokenService, HCaptchaService, CaptchaService],
})
export class AuthModule {}

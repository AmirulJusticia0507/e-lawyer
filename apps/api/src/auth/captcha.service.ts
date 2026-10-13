import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaService {
  private readonly secret: string;
  private readonly verifyUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.secret = config.getOrThrow<string>('CAP_SECRET_KEY');
    this.verifyUrl = config.getOrThrow<string>('CAP_VERIFY_URL');
    this.enabled = config.get<boolean>('CAPTCHA_ENABLED', true);
  }

  async verify(token: string, ip?: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    if (!token) {
      return false;
    }

    const body = new URLSearchParams({
      secret: this.secret,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    try {
      const res = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      throw new HttpException('Verifikasi CAPTCHA gagal', HttpStatus.BAD_GATEWAY);
    }
  }
}
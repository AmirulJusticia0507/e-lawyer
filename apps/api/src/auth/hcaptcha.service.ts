import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HCaptchaService {
  private readonly secret: string;
  private readonly endpoint = 'https://hcaptcha.com/siteverify';

  constructor(private readonly config: ConfigService) {
    this.secret = config.getOrThrow<string>('HCAPTCHA_SECRET_KEY');
  }

  async verify(token: string, ip?: string): Promise<boolean> {
    if (!token) return false;

    // Bypass for development/test keys
    const testSecret = '0x0000000000000000000000000000000000000000';
    if (this.secret === testSecret && token === 'test-token') {
      return true;
    }

    const body = new URLSearchParams({
      secret: this.secret,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      throw new HttpException('Verifikasi hCaptcha gagal', HttpStatus.BAD_GATEWAY);
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const smtpUrl = this.config.get<string>('SMTP_URL', '');
    if (!smtpUrl) {
      this.logger.warn(`SMTP_URL belum dikonfigurasi. Tautan reset untuk ${email}: ${resetUrl}`);
      return;
    }

    const transporter = nodemailer.createTransport(smtpUrl);
    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'e-Lawyer <no-reply@elawyer.local>'),
      to: email,
      subject: 'Reset password akun e-Lawyer',
      text: `Gunakan tautan berikut untuk mengatur ulang password Anda. Tautan berlaku selama 30 menit: ${resetUrl}`,
      html: `<p>Kami menerima permintaan reset password akun e-Lawyer Anda.</p><p><a href="${resetUrl}">Atur ulang password</a></p><p>Tautan ini berlaku selama 30 menit. Abaikan email ini jika Anda tidak meminta reset.</p>`,
    });
  }
}

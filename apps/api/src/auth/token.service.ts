import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, RefreshPayload } from './interfaces/jwt-payload.interface';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get accessSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private get refreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private get accessExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  private get refreshExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlToMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 1000;
    return value * factor;
  }

  async issueTokens(
    payload: Omit<JwtPayload, 'type'>,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { ...payload, type: 'access' } satisfies JwtPayload,
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn },
    );

    const jti = randomUUID();
    const refreshPayload: RefreshPayload = { sub: payload.sub, jti, type: 'refresh' };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + this.ttlToMs(this.refreshExpiresIn)),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return { accessToken, refreshToken, expiresIn: this.accessExpiresIn };
  }

  async verifyRefreshToken(token: string): Promise<RefreshPayload> {
    let decoded: RefreshPayload;
    try {
      decoded = await this.jwt.verifyAsync<RefreshPayload>(token, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau kedaluwarsa');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token sudah tidak berlaku');
    }
    return decoded;
  }

  async rotateRefreshToken(
    oldToken: string,
    payload: Omit<JwtPayload, 'type'>,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<IssuedTokens> {
    await this.revokeRefreshToken(oldToken);
    return this.issueTokens(payload, meta);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

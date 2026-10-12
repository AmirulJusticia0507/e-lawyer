import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const nowInSeconds = Math.floor(now.getTime() / 1000);
  let service: TokenService;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jwt = {
      signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'JWT_ACCESS_SECRET' ? 'access-secret' : 'refresh-secret',
      ),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new TokenService(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caps refresh token and database expiry at the absolute session deadline', async () => {
    const sessionExpiresAt = nowInSeconds + 60;
    await service.issueTokens(
      { sub: 'user-id', email: 'user@example.com', roles: [], permissions: [] },
      undefined,
      sessionExpiresAt,
    );

    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sessionExpiresAt }),
      expect.objectContaining({ expiresIn: 60 }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: new Date(sessionExpiresAt * 1000),
      }),
    });
  });

  it('rejects refresh tokens after the absolute session deadline', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      jti: 'token-id',
      type: 'refresh',
      sessionExpiresAt: nowInSeconds - 1,
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    });

    await expect(service.verifyRefreshToken('refresh-token')).rejects.toThrow(
      'Sesi sudah kedaluwarsa, silakan masuk kembali',
    );
  });

  it('keeps the original absolute deadline when rotating a refresh token', async () => {
    const sessionExpiresAt = nowInSeconds + 60;

    await service.rotateRefreshToken(
      'old-refresh-token',
      { sub: 'user-id', email: 'user@example.com', roles: [], permissions: [] },
      sessionExpiresAt,
    );

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ revokedAt: null }),
      data: { revokedAt: now },
    });
    expect(jwt.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sessionExpiresAt }),
      expect.any(Object),
    );
  });
});

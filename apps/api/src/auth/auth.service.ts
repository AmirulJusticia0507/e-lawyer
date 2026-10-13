import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_ROLE, RoleName } from '../common/constants/roles';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, JwtPayload } from './interfaces/jwt-payload.interface';
import { IssuedTokens, TokenService } from './token.service';
import { AuthMailService } from './auth-mail.service';

export interface AuthResult extends IssuedTokens {
  user: AuthenticatedUser & { fullName: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    private readonly mail: AuthMailService,
  ) {}

  private get rounds(): number {
    return this.config.get<number>('BCRYPT_ROUNDS', 12);
  }

  async register(
    dto: RegisterDto,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.rounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roles: {
          create: {
            role: { connect: { name: DEFAULT_ROLE } },
          },
        },
      },
    });

    return this.completeAuthentication(user.id, meta);
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ip?: string }): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.tokens.revokeAllForUser(user.id);
    return this.completeAuthentication(user.id, meta);
  }

  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const decoded = await this.tokens.verifyRefreshToken(refreshToken);
    const authUser = await this.buildAuthUser(decoded.sub);
    const tokens = await this.tokens.rotateRefreshToken(
      refreshToken,
      this.toJwtPayload(authUser),
      decoded.sessionExpiresAt,
      meta,
    );
    return { ...tokens, user: authUser };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.tokens.revokeRefreshToken(refreshToken);
    return { success: true };
  }

  async forgotPassword(emailInput: string): Promise<{ message: string }> {
    const message = 'Jika email terdaftar, tautan reset password telah dikirim.';
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.toLowerCase() } });
    if (!user || user.status !== 'ACTIVE') return { message };

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:5173').replace(/\/$/, '');
    await this.mail.sendPasswordReset(user.email, `${webUrl}/reset-password?token=${token}`);
    return { message };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashResetToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('Tautan reset tidak valid atau sudah kedaluwarsa');
    }

    const passwordHash = await bcrypt.hash(password, this.rounds);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.tokens.revokeAllForUser(record.userId);
    return { message: 'Password berhasil diperbarui. Silakan masuk kembali.' };
  }

  async me(userId: string): Promise<AuthenticatedUser & { fullName: string }> {
    return this.buildAuthUser(userId);
  }

  private async completeAuthentication(
    userId: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const authUser = await this.buildAuthUser(userId);
    const tokens = await this.tokens.issueTokens(this.toJwtPayload(authUser), meta);
    return { ...tokens, user: authUser };
  }

  private toJwtPayload(user: AuthenticatedUser): Omit<JwtPayload, 'type'> {
    return {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async buildAuthUser(userId: string): Promise<AuthenticatedUser & { fullName: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    const roles = user.roles.map((ur) => ur.role.name as RoleName);
    const permissions = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        permissions.add(`${rp.permission.action}:${rp.permission.subject}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions: [...permissions],
    };
  }
}

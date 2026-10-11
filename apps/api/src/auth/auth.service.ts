import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_ROLE, RoleName } from '../common/constants/roles';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, JwtPayload } from './interfaces/jwt-payload.interface';
import { IssuedTokens, TokenService } from './token.service';

export interface AuthResult extends IssuedTokens {
  user: AuthenticatedUser & { fullName: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  private get rounds(): number {
    return this.config.get<number>('BCRYPT_ROUNDS', 12);
  }

  async register(dto: RegisterDto, meta?: { userAgent?: string; ip?: string }): Promise<AuthResult> {
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
      meta,
    );
    return { ...tokens, user: authUser };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.tokens.revokeRefreshToken(refreshToken);
    return { success: true };
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

  private async buildAuthUser(
    userId: string,
  ): Promise<AuthenticatedUser & { fullName: string }> {
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

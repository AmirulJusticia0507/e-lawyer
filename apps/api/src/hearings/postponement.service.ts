import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HearingStatus, PostponementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_POSTPONEMENTS_PER_HEARING = 2;

@Injectable()
export class PostponementService {
  constructor(private readonly prisma: PrismaService) {}

  async requestPostponement(
    hearingId: string,
    dto: { reason: string; newStartsAt?: string; newEndsAt?: string },
    actorId: string,
  ) {
    const hearing = await this.prisma.hearing.findUnique({
      where: { id: hearingId },
      include: { postponements: true },
    });
    if (!hearing) throw new NotFoundException('Sidang tidak ditemukan');

    const approvedCount = hearing.postponements.filter(
      (p) => p.status === PostponementStatus.APPROVED,
    ).length;
    if (approvedCount >= MAX_POSTPONEMENTS_PER_HEARING) {
      throw new ConflictException(
        `Batas maksimal penundaan (${MAX_POSTPONEMENTS_PER_HEARING}x) telah tercapai`,
      );
    }

    const newStartsAt = dto.newStartsAt ? new Date(dto.newStartsAt) : null;
    const newEndsAt = dto.newEndsAt ? new Date(dto.newEndsAt) : null;
    if (newStartsAt && newEndsAt && newStartsAt >= newEndsAt) {
      throw new BadRequestException('Waktu selesai baru harus setelah waktu mulai baru');
    }

    return this.prisma.postponement.create({
      data: {
        hearingId,
        reason: dto.reason,
        requestedById: actorId,
        extensionCount: approvedCount + 1,
        newStartsAt,
        newEndsAt,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async approvePostponement(id: string, actorId: string) {
    const postponement = await this.prisma.postponement.findUnique({
      where: { id },
      include: { hearing: true },
    });
    if (!postponement) throw new NotFoundException('Permohonan penundaan tidak ditemukan');
    if (postponement.status !== PostponementStatus.PENDING) {
      throw new ConflictException('Permohonan sudah diproses');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.postponement.update({
        where: { id },
        data: {
          status: PostponementStatus.APPROVED,
          approvedById: actorId,
        },
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      });

      if (postponement.newStartsAt && postponement.newEndsAt) {
        await tx.hearing.update({
          where: { id: postponement.hearingId },
          data: {
            startsAt: postponement.newStartsAt,
            endsAt: postponement.newEndsAt,
            status: HearingStatus.POSTPONED,
          },
        });
      }

      return updated;
    });
  }

  async rejectPostponement(id: string, actorId: string) {
    const postponement = await this.prisma.postponement.findUnique({ where: { id } });
    if (!postponement) throw new NotFoundException('Permohonan penundaan tidak ditemukan');
    if (postponement.status !== PostponementStatus.PENDING) {
      throw new ConflictException('Permohonan sudah diproses');
    }

    return this.prisma.postponement.update({
      where: { id },
      data: {
        status: PostponementStatus.REJECTED,
        approvedById: actorId,
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async listPostponements(hearingId: string) {
    return this.prisma.postponement.findMany({
      where: { hearingId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }
}

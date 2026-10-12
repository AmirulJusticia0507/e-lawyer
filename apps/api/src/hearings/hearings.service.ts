import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { HearingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHearingDto, QueryHearingsDto } from './dto/hearing.dto';

const HEARING_INCLUDE = {
  case: { select: { id: true, caseNumber: true, title: true, courtName: true } },
};

@Injectable()
export class HearingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryHearingsDto) {
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (from >= to) throw new ConflictException('Tanggal akhir harus setelah tanggal mulai');

    const where: Prisma.HearingWhereInput = {
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      startsAt: { lt: to },
      endsAt: { gt: from },
    };
    return this.prisma.hearing.findMany({
      where,
      include: HEARING_INCLUDE,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  async create(dto: CreateHearingDto, actorId: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt >= endsAt) throw new ConflictException('Waktu selesai harus setelah waktu mulai');

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const caseRecord = await tx.case.findUnique({
            where: { id: dto.caseId },
            select: { id: true, parties: { select: { id: true } } },
          });
          if (!caseRecord) throw new NotFoundException('Perkara tidak ditemukan');

          const partyIds = caseRecord.parties.map((party) => party.id);
          const overlaps = await tx.hearing.findMany({
            where: {
              status: HearingStatus.SCHEDULED,
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
              OR: [
                { courtroom: { equals: dto.courtroom.trim(), mode: 'insensitive' } },
                { judgeName: { equals: dto.judgeName.trim(), mode: 'insensitive' } },
                ...(partyIds.length
                  ? [{ case: { parties: { some: { id: { in: partyIds } } } } }]
                  : []),
              ],
            },
            include: {
              case: {
                select: {
                  id: true,
                  caseNumber: true,
                  title: true,
                  courtName: true,
                  parties: { select: { id: true } },
                },
              },
            },
            take: 20,
          });
          if (overlaps.length > 0) {
            const reasons = new Set<string>();
            for (const hearing of overlaps) {
              if (hearing.courtroom.toLocaleLowerCase() === dto.courtroom.trim().toLocaleLowerCase()) {
                reasons.add(`ruang sidang ${hearing.courtroom}`);
              }
              if (hearing.judgeName.toLocaleLowerCase() === dto.judgeName.trim().toLocaleLowerCase()) {
                reasons.add(`hakim ${hearing.judgeName}`);
              }
              if (hearing.case.parties.some((party) => partyIds.includes(party.id))) {
                reasons.add('pihak perkara yang sama');
              }
            }
            throw new ConflictException(`Jadwal bentrok: ${[...reasons].join(', ')}`);
          }

          return tx.hearing.create({
            data: {
              caseId: dto.caseId,
              startsAt,
              endsAt,
              courtroom: dto.courtroom.trim(),
              judgeName: dto.judgeName.trim(),
              notes: dto.notes?.trim() || undefined,
              createdById: actorId,
            },
            include: HEARING_INCLUDE,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Jadwal sedang diubah bersamaan. Periksa agenda lalu coba lagi.');
      }
      throw error;
    }
  }
}

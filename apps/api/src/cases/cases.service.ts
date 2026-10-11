import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination, toPaginated } from '../common/utils/pagination';
import { assertTransition } from './case-status';
import {
  AssignCaseDto,
  ChangeStatusDto,
  CreateCaseDto,
  QueryCaseDto,
  UpdateCaseDto,
} from './dto/case.dto';
import { CreatePartyDto, UpdatePartyDto } from './dto/party.dto';
import { CreateInteractionDto } from './dto/interaction.dto';

const CASE_INCLUDE = {
  filedBy: { select: { id: true, fullName: true, email: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  parties: {
    include: { client: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  interactions: {
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { occurredAt: 'desc' as const },
  },
  assignments: {
    include: {
      fromUser: { select: { id: true, fullName: true } },
      toUser: { select: { id: true, fullName: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCaseDto, actorId: string) {
    const caseNumber = dto.caseNumber ?? (await this.generateCaseNumber());
    try {
      return await this.prisma.case.create({
        data: {
          caseNumber,
          title: dto.title,
          description: dto.description,
          courtName: dto.courtName,
          jurisdiction: dto.jurisdiction,
          caseType: dto.caseType,
          filedAt: dto.filedAt ? new Date(dto.filedAt) : undefined,
          filedByUserId: actorId,
          assignedToUserId: actorId,
          parties:
            dto.parties && dto.parties.length > 0
              ? {
                  create: dto.parties.map((p) => ({
                    side: p.side,
                    name: p.name,
                    type: p.type,
                    nik: p.nik,
                    npwp: p.npwp,
                    email: p.email,
                    phone: p.phone,
                    address: p.address as Prisma.InputJsonValue | undefined,
                    clientId: p.clientId ?? undefined,
                    notes: p.notes,
                  })),
                }
              : undefined,
        },
        include: CASE_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Nomor perkara "${caseNumber}" sudah terdaftar`);
      }
      throw error;
    }
  }

  async findAll(query: QueryCaseDto) {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.CaseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.jurisdiction ? { jurisdiction: query.jurisdiction } : {}),
      ...(query.assignedToUserId ? { assignedToUserId: query.assignedToUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { caseNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { courtName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        include: {
          filedBy: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          parties: { select: { id: true, name: true, side: true, isMainParty: true } },
          _count: { select: { interactions: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.case.count({ where }),
    ]);

    return toPaginated(items, total, pagination);
  }

  async findOne(id: string) {
    const existing = await this.prisma.case.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });
    if (!existing) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
    return existing;
  }

  async update(id: string, dto: UpdateCaseDto) {
    await this.ensureExists(id);
    return this.prisma.case.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        courtName: dto.courtName,
        jurisdiction: dto.jurisdiction,
        caseType: dto.caseType,
        filedAt: dto.filedAt ? new Date(dto.filedAt) : undefined,
      },
      include: CASE_INCLUDE,
    });
  }

  async changeStatus(id: string, dto: ChangeStatusDto) {
    const existing = await this.prisma.case.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
    assertTransition(existing.status, dto.status);
    return this.prisma.case.update({
      where: { id },
      data: {
        status: dto.status,
        decidedAt: dto.status === CaseStatus.DECIDED ? new Date() : undefined,
      },
      include: CASE_INCLUDE,
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.prisma.case.delete({ where: { id } });
    return { success: true };
  }

  async addParty(caseId: string, dto: CreatePartyDto) {
    await this.ensureExists(caseId);
    return this.prisma.party.create({
      data: {
        caseId,
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
        clientId: dto.clientId ?? undefined,
      },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }

  async updateParty(caseId: string, partyId: string, dto: UpdatePartyDto) {
    await this.ensureExists(caseId);
    const party = await this.prisma.party.findFirst({ where: { id: partyId, caseId } });
    if (!party) {
      throw new NotFoundException('Pihak tidak ditemukan pada perkara ini');
    }
    return this.prisma.party.update({
      where: { id: partyId },
      data: {
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
        clientId: dto.clientId ?? undefined,
      },
      include: { client: { select: { id: true, fullName: true } } },
    });
  }

  async removeParty(caseId: string, partyId: string): Promise<{ success: true }> {
    await this.ensureExists(caseId);
    const party = await this.prisma.party.findFirst({ where: { id: partyId, caseId } });
    if (!party) {
      throw new NotFoundException('Pihak tidak ditemukan pada perkara ini');
    }
    await this.prisma.party.delete({ where: { id: partyId } });
    return { success: true };
  }

  async addInteraction(caseId: string, dto: CreateInteractionDto, actorId: string) {
    await this.ensureExists(caseId);
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) {
        throw new NotFoundException('Klien tidak ditemukan');
      }
    }
    return this.prisma.interaction.create({
      data: {
        ...dto,
        caseId,
        createdById: actorId,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async assignCase(id: string, dto: AssignCaseDto, actorId: string) {
    const existing = await this.prisma.case.findUnique({ where: { id }, select: { id: true, assignedToUserId: true } });
    if (!existing) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
    const target = await this.prisma.user.findUnique({ where: { id: dto.toUserId } });
    if (!target) {
      throw new NotFoundException('Advokat tujuan tidak ditemukan');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caseAssignment.create({
        data: {
          caseId: id,
          fromUserId: existing.assignedToUserId ?? undefined,
          toUserId: dto.toUserId,
          assignedById: actorId,
          note: dto.note,
        },
      });
      return tx.case.update({
        where: { id },
        data: { assignedToUserId: dto.toUserId },
        include: CASE_INCLUDE,
      });
    });
    return updated;
  }

  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count({ where: { caseNumber: { startsWith: `${year}` } } });
    return `${year}/${String(count + 1).padStart(4, '0')}/EL`;
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
  }
}
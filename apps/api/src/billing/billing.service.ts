import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateTimeAmount, elapsedMinutes, validateFeeValues } from './billing.rules';
import {
  CreateFeeSchemeDto,
  CreateManualTimeEntryDto,
  QueryFeeSchemeDto,
  QueryTimeEntryDto,
  StartTimerDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listTimeEntries(query: QueryTimeEntryDto) {
    return this.prisma.timeEntry.findMany({
      where: { caseId: query.caseId, userId: query.userId },
      orderBy: { startedAt: 'desc' },
      include: { case: { select: { caseNumber: true, title: true } } },
    });
  }

  async startTimer(dto: StartTimerDto, userId: string) {
    await this.ensureCase(dto.caseId);
    const running = await this.prisma.timeEntry.findFirst({
      where: { userId, status: TimeEntryStatus.RUNNING },
      select: { id: true },
    });
    if (running) throw new ConflictException('Masih ada timer aktif');
    return this.prisma.timeEntry.create({
      data: {
        caseId: dto.caseId,
        userId,
        description: dto.description,
        billable: dto.billable ?? true,
        hourlyRate: dto.hourlyRate,
        status: TimeEntryStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  async stopTimer(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Time entry tidak ditemukan');
    if (entry.status !== TimeEntryStatus.RUNNING)
      throw new ConflictException('Timer sudah dihentikan');
    const endedAt = new Date();
    const durationMinutes = elapsedMinutes(entry.startedAt, endedAt);
    const rate = entry.hourlyRate ? Number(entry.hourlyRate) : undefined;
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.STOPPED,
        endedAt,
        durationMinutes,
        amount: calculateTimeAmount(durationMinutes, rate),
      },
    });
  }

  async createManualTimeEntry(dto: CreateManualTimeEntryDto, userId: string) {
    await this.ensureCase(dto.caseId);
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    const durationMinutes = elapsedMinutes(startedAt, endedAt);
    return this.prisma.timeEntry.create({
      data: {
        caseId: dto.caseId,
        userId,
        description: dto.description,
        billable: dto.billable ?? true,
        hourlyRate: dto.hourlyRate,
        amount: calculateTimeAmount(durationMinutes, dto.hourlyRate),
        status: TimeEntryStatus.STOPPED,
        startedAt,
        endedAt,
        durationMinutes,
      },
    });
  }

  listFeeSchemes(query: QueryFeeSchemeDto) {
    return this.prisma.feeScheme.findMany({
      where: { caseId: query.caseId, clientId: query.clientId, type: query.type, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFeeScheme(dto: CreateFeeSchemeDto) {
    if (!dto.caseId && !dto.clientId)
      throw new ConflictException('Skema tarif harus terkait perkara atau klien');
    validateFeeValues(dto.type, dto);
    if (dto.caseId) await this.ensureCase(dto.caseId);
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException('Klien tidak ditemukan');
    }
    return this.prisma.feeScheme.create({
      data: {
        ...dto,
        currency: dto.currency?.toUpperCase() ?? 'IDR',
        amount: dto.amount === undefined ? undefined : new Prisma.Decimal(dto.amount),
        hourlyRate: dto.hourlyRate === undefined ? undefined : new Prisma.Decimal(dto.hourlyRate),
        successPercentage:
          dto.successPercentage === undefined
            ? undefined
            : new Prisma.Decimal(dto.successPercentage),
      },
    });
  }

  async deactivateFeeScheme(id: string) {
    const existing = await this.prisma.feeScheme.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Skema tarif tidak ditemukan');
    return this.prisma.feeScheme.update({ where: { id }, data: { active: false } });
  }

  private async ensureCase(id: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!caseRecord) throw new NotFoundException('Perkara tidak ditemukan');
  }
}

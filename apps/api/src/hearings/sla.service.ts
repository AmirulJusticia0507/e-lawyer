import { Injectable, NotFoundException } from '@nestjs/common';
import { HearingStage, Prisma, SlaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STAGE_SEQUENCE: HearingStage[] = [
  HearingStage.PERSIANGAN,
  HearingStage.PEMBUKTIAN,
  HearingStage.PEMBAHASAN,
  HearingStage.PUTUSAN,
];

const STAGE_LABELS: Record<HearingStage, string> = {
  [HearingStage.PERSIANGAN]: 'Persiapan & Sidang',
  [HearingStage.PEMBUKTIAN]: 'Pembuktian',
  [HearingStage.PEMBAHASAN]: 'Pembahasan',
  [HearingStage.PUTUSAN]: 'Putusan',
};

const STAGE_SLA_DAYS: Record<HearingStage, number> = {
  [HearingStage.PERSIANGAN]: 7,
  [HearingStage.PEMBUKTIAN]: 30,
  [HearingStage.PEMBAHASAN]: 14,
  [HearingStage.PUTUSAN]: 30,
};

const AT_RISK_THRESHOLD_HOURS = 24;

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  async createSlaTimersForHearing(hearingId: string) {
    const hearing = await this.prisma.hearing.findUnique({
      where: { id: hearingId },
      select: { startsAt: true },
    });
    if (!hearing) throw new NotFoundException('Sidang tidak ditemukan');

    const timers: Prisma.HearingSlaCreateManyInput[] = [];
    let cursor = hearing.startsAt;

    for (const stage of STAGE_SEQUENCE) {
      const deadline = new Date(cursor.getTime() + STAGE_SLA_DAYS[stage] * 24 * 60 * 60 * 1000);
      timers.push({
        hearingId,
        stage,
        label: STAGE_LABELS[stage],
        startedAt: cursor,
        deadlineAt: deadline,
      });
      cursor = deadline;
    }

    return this.prisma.hearingSla.createMany({ data: timers });
  }

  async listSlaTimers(hearingId: string) {
    return this.prisma.hearingSla.findMany({
      where: { hearingId },
      orderBy: { startedAt: 'asc' },
    });
  }

  async advanceStage(hearingId: string, stage: HearingStage) {
    const current = await this.prisma.hearingSla.findFirst({
      where: { hearingId, stage, status: { not: 'COMPLETED' } },
    });
    if (!current) throw new NotFoundException('Tahapan SLA tidak ditemukan');

    const updated = await this.prisma.hearingSla.update({
      where: { id: current.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const stages = STAGE_SEQUENCE;
    const currentIdx = stages.indexOf(stage);
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      await this.prisma.hearingSla.updateMany({
        where: { hearingId, stage: nextStage },
        data: { status: 'ON_TRACK' },
      });
    }

    return updated;
  }

  async sweepSla() {
    const now = new Date();
    const atRiskThreshold = new Date(now.getTime() + AT_RISK_THRESHOLD_HOURS * 60 * 60 * 1000);

    const breached = await this.prisma.hearingSla.findMany({
      where: {
        status: { in: ['ON_TRACK', 'AT_RISK'] },
        deadlineAt: { lt: now },
      },
      include: { hearing: { include: { case: true } } },
    });

    for (const timer of breached) {
      await this.prisma.hearingSla.update({
        where: { id: timer.id },
        data: { status: 'BREACHED' },
      });
      await this.prisma.slaAlert.create({
        data: {
          slaTimerId: timer.id,
          level: 'BREACHED',
          message: `SLA tahapan "${timer.label}" terlambat sejak ${timer.deadlineAt.toISOString()}`,
        },
      });
    }

    const atRisk = await this.prisma.hearingSla.findMany({
      where: {
        status: 'ON_TRACK',
        deadlineAt: { gt: now, lte: atRiskThreshold },
      },
    });

    for (const timer of atRisk) {
      await this.prisma.hearingSla.update({
        where: { id: timer.id },
        data: { status: 'AT_RISK' },
      });
      await this.prisma.slaAlert.create({
        data: {
          slaTimerId: timer.id,
          level: 'AT_RISK',
          message: `SLA tahapan "${timer.label}" mendekati batas (${timer.deadlineAt.toISOString()})`,
        },
      });
    }

    return { breached: breached.length, atRisk: atRisk.length };
  }

  async getStatistics() {
    const [total, byStatus, byStage, recentAlerts] = await Promise.all([
      this.prisma.hearingSla.count(),
      this.prisma.hearingSla.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.hearingSla.groupBy({
        by: ['stage'],
        _count: { _all: true },
      }),
      this.prisma.slaAlert.findMany({
        orderBy: { triggeredAt: 'desc' },
        take: 20,
        include: { slaTimer: { include: { hearing: { include: { case: true } } } } },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byStage: byStage.map((s) => ({ stage: s.stage, count: s._count._all })),
      recentAlerts,
    };
  }
}

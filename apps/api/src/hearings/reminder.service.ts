import { Injectable } from '@nestjs/common';
import { ReminderStatus, ReminderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REMINDER_OFFSETS: Record<ReminderType, number> = {
  [ReminderType.H7]: 7 * 24 * 60 * 60 * 1000,
  [ReminderType.H3]: 3 * 24 * 60 * 60 * 1000,
  [ReminderType.H1]: 1 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class ReminderService {
  constructor(private readonly prisma: PrismaService) {}

  async createRemindersForHearing(hearingId: string) {
    const hearing = await this.prisma.hearing.findUnique({
      where: { id: hearingId },
      select: { startsAt: true },
    });
    if (!hearing) return;

    const data = Object.values(ReminderType).map((type) => ({
      hearingId,
      type,
      triggerAt: new Date(hearing.startsAt.getTime() - REMINDER_OFFSETS[type]),
    }));

    return this.prisma.reminder.createMany({ data });
  }

  async listReminders(hearingId: string) {
    return this.prisma.reminder.findMany({
      where: { hearingId },
      orderBy: { triggerAt: 'asc' },
    });
  }

  async sweepReminders() {
    const now = new Date();
    const pending = await this.prisma.reminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        triggerAt: { lte: now },
      },
      include: { hearing: { include: { case: true } } },
    });

    let sent = 0;
    for (const reminder of pending) {
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.SENT,
          sentAt: now,
        },
      });
      sent += 1;
    }

    return { sent };
  }
}

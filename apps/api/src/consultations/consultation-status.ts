import { BadRequestException } from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';

const TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[] | 'terminal'> = {
  REQUESTED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: 'terminal',
  CANCELLED: 'terminal',
};

export function canTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  const allowed = TRANSITIONS[from];
  return allowed !== 'terminal' && allowed.includes(to);
}

export function assertTransition(from: ConsultationStatus, to: ConsultationStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Transisi status konsultasi tidak valid: ${from} -> ${to}`);
  }
}

export const CONSULTATION_FLOW: Record<ConsultationStatus, ConsultationStatus[]> = TRANSITIONS as unknown as Record<
  ConsultationStatus,
  ConsultationStatus[]
>;

import { BadRequestException } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';

const TRANSITIONS: Record<CaseStatus, CaseStatus[] | 'terminal'> = {
  NEW: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['POSTPONED', 'DECIDED', 'CLOSED'],
  POSTPONED: ['ACTIVE', 'DECIDED', 'CLOSED'],
  DECIDED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: 'terminal',
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  const allowed = TRANSITIONS[from];
  return allowed !== 'terminal' && allowed.includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Transisi status tidak valid: ${from} -> ${to}`,
    );
  }
}

export const STATUS_FLOW: Record<CaseStatus, CaseStatus[]> = TRANSITIONS as unknown as Record<
  CaseStatus,
  CaseStatus[]
>;
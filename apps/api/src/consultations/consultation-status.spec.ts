import { ConsultationStatus } from '@prisma/client';
import { canTransition } from './consultation-status';

describe('consultation status workflow', () => {
  it('memungkinkan alur normal dari REQUESTED sampai COMPLETED', () => {
    expect(canTransition(ConsultationStatus.REQUESTED, ConsultationStatus.SCHEDULED)).toBe(true);
    expect(canTransition(ConsultationStatus.SCHEDULED, ConsultationStatus.ONGOING)).toBe(true);
    expect(canTransition(ConsultationStatus.ONGOING, ConsultationStatus.COMPLETED)).toBe(true);
  });

  it('menolak lompatan status yang tidak valid', () => {
    expect(canTransition(ConsultationStatus.REQUESTED, ConsultationStatus.COMPLETED)).toBe(false);
    expect(canTransition(ConsultationStatus.COMPLETED, ConsultationStatus.ONGOING)).toBe(false);
  });

  it('memperlakukan COMPLETED dan CANCELLED sebagai status terminal', () => {
    expect(canTransition(ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED)).toBe(false);
    expect(canTransition(ConsultationStatus.CANCELLED, ConsultationStatus.SCHEDULED)).toBe(false);
  });

  it('memungkinkan pembatalan dari setiap status aktif', () => {
    expect(canTransition(ConsultationStatus.REQUESTED, ConsultationStatus.CANCELLED)).toBe(true);
    expect(canTransition(ConsultationStatus.SCHEDULED, ConsultationStatus.CANCELLED)).toBe(true);
    expect(canTransition(ConsultationStatus.ONGOING, ConsultationStatus.CANCELLED)).toBe(true);
  });
});

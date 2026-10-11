import { CaseStatus } from '@prisma/client';
import { canTransition } from './case-status';

describe('Case status machine', () => {
  it('mengizinkan NEW -> ACTIVE', () => {
    expect(canTransition(CaseStatus.NEW, CaseStatus.ACTIVE)).toBe(true);
  });

  it('mengizinkan NEW -> ARCHIVED', () => {
    expect(canTransition(CaseStatus.NEW, CaseStatus.ARCHIVED)).toBe(true);
  });

  it('melarang lompatan langsung NEW -> DECIDED', () => {
    expect(canTransition(CaseStatus.NEW, CaseStatus.DECIDED)).toBe(false);
  });

  it('mengizinkan ACTIVE -> POSTPONED dan kembali', () => {
    expect(canTransition(CaseStatus.ACTIVE, CaseStatus.POSTPONED)).toBe(true);
    expect(canTransition(CaseStatus.POSTPONED, CaseStatus.ACTIVE)).toBe(true);
  });

  it('mengizinkan ACTIVE -> DECIDED dan DECIDED -> CLOSED', () => {
    expect(canTransition(CaseStatus.ACTIVE, CaseStatus.DECIDED)).toBe(true);
    expect(canTransition(CaseStatus.DECIDED, CaseStatus.CLOSED)).toBe(true);
  });

  it('ARCHIVED bersifat terminal', () => {
    expect(canTransition(CaseStatus.ARCHIVED, CaseStatus.CLOSED)).toBe(false);
    expect(canTransition(CaseStatus.ARCHIVED, CaseStatus.ACTIVE)).toBe(false);
  });
})
import { AmendmentType, LegalSourceStatus } from '@prisma/client';
import {
  buildVersionTimeline,
  formatDate,
  isWithinPeriod,
  resolveApplicability,
  resolveStatusAt,
} from './legal-version';

const day = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

describe('legal-version', () => {
  describe('resolveApplicability', () => {
    it('menandai pasal yang sedang berlaku sebagai APPLICABLE', () => {
      const result = resolveApplicability(
        { status: LegalSourceStatus.ACTIVE, effectiveFrom: day('2020-01-01') },
        day('2024-06-01'),
      );
      expect(result.state).toBe('APPLICABLE');
      expect(result.label).toBe('Berlaku');
    });

    it('menandai pasal yang belum berlaku', () => {
      const result = resolveApplicability(
        { status: LegalSourceStatus.ACTIVE, effectiveFrom: day('2025-01-01') },
        day('2024-06-01'),
      );
      expect(result.state).toBe('NOT_YET_EFFECTIVE');
      expect(result.message).toContain('2025-01-01');
    });

    it('menandai pasal yang masa berlakunya sudah habis', () => {
      const result = resolveApplicability(
        {
          status: LegalSourceStatus.ACTIVE,
          effectiveFrom: day('2020-01-01'),
          effectiveUntil: day('2023-12-31'),
        },
        day('2024-06-01'),
      );
      expect(result.state).toBe('EXPIRED');
    });

    it('menandai pasal yang dicabut', () => {
      const result = resolveApplicability({ status: LegalSourceStatus.REPEALED }, day('2024-06-01'));
      expect(result.state).toBe('REPEALED');
    });

    it('status rancangan dan tidak terkurasi dibedakan', () => {
      expect(resolveApplicability({ status: LegalSourceStatus.DRAFT }, day('2024-06-01')).state).toBe(
        'DRAFT',
      );
      expect(
        resolveApplicability({ status: LegalSourceStatus.UNKNOWN }, day('2024-06-01')).state,
      ).toBe('UNKNOWN');
    });

    it('pasal tanpa periode dianggap berlaku', () => {
      expect(resolveApplicability({ status: LegalSourceStatus.ACTIVE }, day('2024-06-01')).state).toBe(
        'APPLICABLE',
      );
    });
  });

  describe('isWithinPeriod', () => {
    it('menerima rentang yang inklusif di kedua ujung', () => {
      const period = { effectiveFrom: day('2020-01-01'), effectiveUntil: day('2024-12-31') };
      expect(isWithinPeriod(period, day('2020-01-01'))).toBe(true);
      expect(isWithinPeriod(period, day('2024-12-31'))).toBe(true);
      expect(isWithinPeriod(period, day('2019-12-31'))).toBe(false);
      expect(isWithinPeriod(period, day('2025-01-01'))).toBe(false);
    });
  });

  describe('resolveStatusAt', () => {
    const period = {
      status: LegalSourceStatus.ACTIVE,
      effectiveFrom: day('2020-01-01'),
      effectiveUntil: null,
    };

    it('mengabaikan amendment yang belum berlaku pada tanggal tersebut', () => {
      const status = resolveStatusAt(
        period,
        [{ type: AmendmentType.REPEALS, effectiveAt: day('2026-01-01') }],
        day('2024-06-01'),
      );
      expect(status).toBe(LegalSourceStatus.ACTIVE);
    });

    it('menjadi dicabut ketika amendment pencabut telah berlaku', () => {
      const status = resolveStatusAt(
        period,
        [{ type: AmendmentType.REPEALS, effectiveAt: day('2024-01-01') }],
        day('2024-06-01'),
      );
      expect(status).toBe(LegalSourceStatus.REPEALED);
    });

    it('menggunakan amendment terbaru yang sudah berlaku', () => {
      const status = resolveStatusAt(
        period,
        [
          { type: AmendmentType.REPEALS, effectiveAt: day('2023-01-01') },
          { type: AmendmentType.AMENDS, effectiveAt: day('2024-01-01') },
        ],
        day('2024-06-01'),
      );
      expect(status).toBe(LegalSourceStatus.AMENDED);
    });

    it('perubahan sebelum tanggal promulgasi dianggap rancangan', () => {
      const status = resolveStatusAt(
        { status: LegalSourceStatus.ACTIVE, effectiveFrom: day('2025-01-01') },
        [],
        day('2024-06-01'),
      );
      expect(status).toBe(LegalSourceStatus.DRAFT);
    });

    it('periode yang sudah lewat menghasilkan status dicabut', () => {
      const status = resolveStatusAt(
        { status: LegalSourceStatus.ACTIVE, effectiveFrom: day('2020-01-01'), effectiveUntil: day('2023-01-01') },
        [],
        day('2024-06-01'),
      );
      expect(status).toBe(LegalSourceStatus.REPEALED);
    });
  });

  describe('buildVersionTimeline', () => {
    it('mengurutkan peristiwa berdasarkan tanggal', () => {
      const timeline = buildVersionTimeline(
        { effectiveFrom: day('2020-01-01'), effectiveUntil: day('2026-01-01') },
        [{ type: AmendmentType.AMENDS, effectiveAt: day('2022-05-01') }],
      );
      expect(timeline.map((event) => event.date)).toEqual([
        '2020-01-01',
        '2022-05-01',
        '2026-01-01',
      ]);
    });

    it('melabeli jenis amendment secara tepat', () => {
      const timeline = buildVersionTimeline({}, [
        { type: AmendmentType.REPEALS, effectiveAt: day('2022-01-01') },
        { type: AmendmentType.REPLACES, effectiveAt: day('2023-01-01') },
        { type: AmendmentType.SUPPLEMENTS, effectiveAt: day('2024-01-01') },
      ]);
      expect(timeline.map((event) => event.label)).toEqual([
        'Dicabut',
        'Diganti seluruhnya',
        'Dilengkapi',
      ]);
      expect(timeline.find((event) => event.label === 'Dicabut')?.type).toBe('REPEALED');
    });
  });

  describe('formatDate', () => {
    it('memformat tanggal menjadi ISO harian dan menangani null', () => {
      expect(formatDate(day('2024-06-01'))).toBe('2024-06-01');
      expect(formatDate(null)).toBeNull();
      expect(formatDate(undefined)).toBeNull();
    });
  });
});
import {
  BACKDATE_TOLERANCE_DAYS,
  DELAY_PATTERN_EXTENSIONS,
  UPLOAD_BURST_THRESHOLD,
  anchorHash,
  anomalyForCheck,
  detectBackdate,
  detectClaimChanged,
  detectDeadlineBreach,
  detectDelayPattern,
  detectReceiptExpiry,
  detectUploadBurst,
  evaluateIntegrity,
  sha256,
  transitionReceipt,
} from './integrity.rules';
import { AnomalyType, IntegrityCheckResult, PartySide, ReceiptStatus } from '@prisma/client';

describe('integrity.rules', () => {
  describe('detectUploadBurst', () => {
    it('menandai burst bila jumlah upload mencapai ambang', () => {
      expect(detectUploadBurst(UPLOAD_BURST_THRESHOLD)).toBe(true);
      expect(detectUploadBurst(UPLOAD_BURST_THRESHOLD - 1)).toBe(false);
      expect(detectUploadBurst(0)).toBe(false);
    });
  });

  describe('detectBackdate', () => {
    const now = new Date('2026-01-15T00:00:00Z');

    it('menandai tanggal klaim jauh di masa lalu', () => {
      const claimed = new Date(
        now.getTime() - (BACKDATE_TOLERANCE_DAYS + 1) * 24 * 60 * 60 * 1000,
      );
      expect(detectBackdate(claimed, now)).toBe(true);
    });

    it('menerima selisih wajar', () => {
      const claimed = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(detectBackdate(claimed, now)).toBe(false);
    });

    it('menandai tanggal klaim di masa depan', () => {
      const claimed = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      expect(detectBackdate(claimed, now)).toBe(true);
    });
  });

  describe('detectClaimChanged', () => {
    it('menandai perubahan nama atau sisi pihak', () => {
      const before = { name: 'PT Maju', side: PartySide.PLAINTIFF };
      expect(detectClaimChanged(before, { ...before })).toBe(false);
      expect(
        detectClaimChanged(before, { name: 'PT Makmur', side: PartySide.PLAINTIFF }),
      ).toBe(true);
      expect(detectClaimChanged(before, { name: 'PT Maju', side: PartySide.DEFENDANT })).toBe(
        true,
      );
    });
  });

  describe('detectDelayPattern', () => {
    it('menandai pola tunda pada perpanjangan berulang', () => {
      expect(detectDelayPattern(DELAY_PATTERN_EXTENSIONS)).toBe(true);
      expect(detectDelayPattern(DELAY_PATTERN_EXTENSIONS - 1)).toBe(false);
    });
  });

  describe('detectDeadlineBreach / detectReceiptExpiry', () => {
    it('menandai deadline terlampaui dan resi kedaluwarsa', () => {
      const now = new Date('2026-01-15T00:00:00Z');
      expect(detectDeadlineBreach(new Date('2026-01-14T23:59:59Z'), now)).toBe(true);
      expect(detectDeadlineBreach(new Date('2026-01-16T00:00:00Z'), now)).toBe(false);
      expect(detectReceiptExpiry(new Date('2025-12-01T00:00:00Z'), now)).toBe(true);
      expect(detectReceiptExpiry(new Date('2026-01-14T00:00:00Z'), now)).toBe(false);
    });
  });

  describe('evaluateIntegrity', () => {
    it('membandingkan hash tanpa mempedulikan kapitalisasi', () => {
      expect(evaluateIntegrity('abc123', 'ABC123')).toBe(IntegrityCheckResult.MATCH);
      expect(evaluateIntegrity('abc123', 'def456')).toBe(IntegrityCheckResult.MISMATCH);
      expect(evaluateIntegrity('abc123', null)).toBe(IntegrityCheckResult.MISSING_FILE);
    });
  });

  describe('sha256 & anchorHash', () => {
    it('menghasilkan hash SHA-256 yang deterministik', () => {
      expect(sha256('e-lawyer')).toHaveLength(64);
      expect(sha256('e-lawyer')).toBe(sha256('e-lawyer'));
      expect(sha256('e-lawyer')).not.toBe(sha256('e-lawyer2'));
    });

    it('anchor terikat konten, waktu, dan rantai sebelumnya', () => {
      const at = new Date('2026-01-15T00:00:00Z');
      const chain1 = anchorHash(null, 'aaa', at);
      const chain2 = anchorHash(chain1, 'bbb', at);
      expect(chain1).toHaveLength(64);
      expect(chain2).not.toBe(chain1);
      expect(anchorHash(null, 'aaa', at)).toBe(chain1);
      expect(anchorHash(null, 'aaa', new Date('2026-01-16T00:00:00Z'))).not.toBe(chain1);
    });
  });

  describe('transitionReceipt', () => {
    it('hanya mentransisi dari status SENT', () => {
      expect(transitionReceipt(ReceiptStatus.SENT, 'confirm')).toBe(ReceiptStatus.CONFIRMED);
      expect(transitionReceipt(ReceiptStatus.SENT, 'dispute')).toBe(ReceiptStatus.DISPUTED);
      expect(transitionReceipt(ReceiptStatus.SENT, 'expire')).toBe(ReceiptStatus.EXPIRED);
      expect(() => transitionReceipt(ReceiptStatus.CONFIRMED, 'confirm')).toThrow();
      expect(() => transitionReceipt(ReceiptStatus.DISPUTED, 'confirm')).toThrow();
    });
  });

  describe('anomalyForCheck', () => {
    it('hanya menandai HASH_MISMATCH bila hasil tidak MATCH', () => {
      expect(anomalyForCheck(IntegrityCheckResult.MATCH)).toBeNull();
      expect(anomalyForCheck(IntegrityCheckResult.MISMATCH)).toBe(AnomalyType.HASH_MISMATCH);
      expect(anomalyForCheck(IntegrityCheckResult.MISSING_FILE)).toBe(
        AnomalyType.HASH_MISMATCH,
      );
    });
  });
});

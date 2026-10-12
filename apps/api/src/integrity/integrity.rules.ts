import { createHash } from 'crypto';
import {
  AnomalyType,
  IntegrityCheckResult,
  PartySide,
  ReceiptStatus,
} from '@prisma/client';

export const UPLOAD_BURST_WINDOW_MS = 10 * 60 * 1000;
export const UPLOAD_BURST_THRESHOLD = 5;
export const BACKDATE_TOLERANCE_DAYS = 7;
export const DELAY_PATTERN_EXTENSIONS = 3;
export const RECEIPT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function detectUploadBurst(
  recentUploads: number,
  threshold: number = UPLOAD_BURST_THRESHOLD,
): boolean {
  return recentUploads >= threshold;
}

export function detectBackdate(
  claimedAt: Date,
  recordedAt: Date,
  toleranceDays: number = BACKDATE_TOLERANCE_DAYS,
): boolean {
  const claimed = claimedAt.getTime();
  const recorded = recordedAt.getTime();
  if (claimed > recorded + 24 * 60 * 60 * 1000) {
    return true;
  }
  return recorded - claimed > toleranceDays * 24 * 60 * 60 * 1000;
}

export function detectClaimChanged(
  before: { name: string; side: PartySide },
  after: { name: string; side: PartySide },
): boolean {
  return before.name !== after.name || before.side !== after.side;
}

export function detectDelayPattern(
  extensionCount: number,
  threshold: number = DELAY_PATTERN_EXTENSIONS,
): boolean {
  return extensionCount >= threshold;
}

export function detectDeadlineBreach(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() < now.getTime();
}

export function detectReceiptExpiry(sentAt: Date, now: Date): boolean {
  return now.getTime() - sentAt.getTime() > RECEIPT_EXPIRY_MS;
}

export function evaluateIntegrity(
  expectedSha256: string,
  actualSha256: string | null,
): IntegrityCheckResult {
  if (actualSha256 === null) {
    return IntegrityCheckResult.MISSING_FILE;
  }
  return actualSha256.toLowerCase() === expectedSha256.toLowerCase()
    ? IntegrityCheckResult.MATCH
    : IntegrityCheckResult.MISMATCH;
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function anchorHash(prevAnchor: string | null, contentHash: string, at: Date): string {
  return sha256(`${prevAnchor ?? 'genesis'}:${contentHash}:${at.toISOString()}`);
}

export type ReceiptEvent = 'confirm' | 'dispute' | 'expire';

export function transitionReceipt(
  current: ReceiptStatus,
  event: ReceiptEvent,
): ReceiptStatus {
  if (current !== ReceiptStatus.SENT) {
    throw new Error(`Status resi ${current} tidak dapat diproses via event ${event}`);
  }
  switch (event) {
    case 'confirm':
      return ReceiptStatus.CONFIRMED;
    case 'dispute':
      return ReceiptStatus.DISPUTED;
    case 'expire':
      return ReceiptStatus.EXPIRED;
  }
}

export function anomalyForCheck(result: IntegrityCheckResult): AnomalyType | null {
  return result === IntegrityCheckResult.MATCH ? null : AnomalyType.HASH_MISMATCH;
}

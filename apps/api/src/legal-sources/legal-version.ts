import { AmendmentType, LegalSourceStatus } from '@prisma/client';

export type ApplicabilityState =
  | 'APPLICABLE'
  | 'NOT_YET_EFFECTIVE'
  | 'EXPIRED'
  | 'REPEALED'
  | 'DRAFT'
  | 'UNKNOWN';

export interface EffectivePeriod {
  status?: LegalSourceStatus | null;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
}

export interface Applicability {
  state: ApplicabilityState;
  label: string;
  message: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

export interface AmendmentFact {
  type: AmendmentType;
  effectiveAt: Date | null;
}

export const APPLICABILITY_LABELS: Record<ApplicabilityState, string> = {
  APPLICABLE: 'Berlaku',
  NOT_YET_EFFECTIVE: 'Belum Berlaku',
  EXPIRED: 'Berakhir Berlaku',
  REPEALED: 'Dicabut',
  DRAFT: 'Rancangan',
  UNKNOWN: 'Status Tidak Diketahui',
};

export function formatDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function isWithinPeriod(period: EffectivePeriod, at: Date): boolean {
  if (period.effectiveFrom && at.getTime() < period.effectiveFrom.getTime()) return false;
  if (period.effectiveUntil && at.getTime() > period.effectiveUntil.getTime()) return false;
  return true;
}

export function resolveApplicability(period: EffectivePeriod, at: Date): Applicability {
  const from = period.effectiveFrom ?? null;
  const until = period.effectiveUntil ?? null;
  const base = { effectiveFrom: from, effectiveUntil: until };

  if (period.status === LegalSourceStatus.REPEALED) {
    return {
      ...base,
      state: 'REPEALED',
      label: APPLICABILITY_LABELS.REPEALED,
      message: 'Naskah peraturan ini telah dicabut.',
    };
  }
  if (period.status === LegalSourceStatus.DRAFT) {
    return {
      ...base,
      state: 'DRAFT',
      label: APPLICABILITY_LABELS.DRAFT,
      message: 'Naskah peraturan ini masih berstatus rancangan.',
    };
  }
  if (period.status === LegalSourceStatus.UNKNOWN) {
    return {
      ...base,
      state: 'UNKNOWN',
      label: APPLICABILITY_LABELS.UNKNOWN,
      message: 'Status keberlakuan belum terkurasi pada sumber ini.',
    };
  }
  if (period.effectiveFrom && at.getTime() < period.effectiveFrom.getTime()) {
    return {
      ...base,
      state: 'NOT_YET_EFFECTIVE',
      label: APPLICABILITY_LABELS.NOT_YET_EFFECTIVE,
      message: `Berlaku mulai ${formatDate(from)}.`,
    };
  }
  if (period.effectiveUntil && at.getTime() > period.effectiveUntil.getTime()) {
    return {
      ...base,
      state: 'EXPIRED',
      label: APPLICABILITY_LABELS.EXPIRED,
      message: `Berlaku terakhir sampai ${formatDate(until)}.`,
    };
  }
  return {
    ...base,
    state: 'APPLICABLE',
    label: APPLICABILITY_LABELS.APPLICABLE,
    message: 'Berlaku pada tanggal tersebut.',
  };
}

/**
 * Status akhir sebuah peraturan pada tanggal tertentu, dengan memperhitungkan
 * amendment yang sudah berlaku pada tanggal itu.
 */
export function resolveStatusAt(
  period: EffectivePeriod,
  amendments: AmendmentFact[],
  at: Date,
): LegalSourceStatus {
  const applicable = amendments
    .filter((amendment) => amendment.effectiveAt && amendment.effectiveAt.getTime() <= at.getTime())
    .sort((a, b) => (a.effectiveAt!.getTime() - b.effectiveAt!.getTime()));

  const latest = applicable[applicable.length - 1];
  if (latest) {
    if (latest.type === AmendmentType.REPEALS) return LegalSourceStatus.REPEALED;
    if (latest.type === AmendmentType.REPLACES) return LegalSourceStatus.AMENDED;
    if (
      latest.type === AmendmentType.AMENDS ||
      latest.type === AmendmentType.SUPPLEMENTS
    ) {
      return LegalSourceStatus.AMENDED;
    }
  }

  if (period.effectiveFrom && at.getTime() < period.effectiveFrom.getTime()) {
    return LegalSourceStatus.DRAFT;
  }
  if (period.effectiveUntil && at.getTime() > period.effectiveUntil.getTime()) {
    return LegalSourceStatus.REPEALED;
  }
  return period.status ?? LegalSourceStatus.UNKNOWN;
}

export interface VersionEvent {
  date: string | null;
  type: 'EFFECTIVE' | 'AMENDED' | 'REPEALED';
  label: string;
  note: string | null;
}

export function buildVersionTimeline(
  period: EffectivePeriod,
  amendments: AmendmentFact[],
): VersionEvent[] {
  const events: VersionEvent[] = [];
  if (period.effectiveFrom) {
    events.push({
      date: formatDate(period.effectiveFrom),
      type: 'EFFECTIVE',
      label: 'Mulai berlaku',
      note: null,
    });
  }
  for (const amendment of amendments) {
    if (!amendment.effectiveAt) continue;
    const type: VersionEvent['type'] =
      amendment.type === AmendmentType.REPEALS ? 'REPEALED' : 'AMENDED';
    const label =
      amendment.type === AmendmentType.REPEALS
        ? 'Dicabut'
        : amendment.type === AmendmentType.REPLACES
          ? 'Diganti seluruhnya'
          : amendment.type === AmendmentType.SUPPLEMENTS
            ? 'Dilengkapi'
            : 'Diubah';
    events.push({ date: formatDate(amendment.effectiveAt), type, label, note: null });
  }
  if (period.effectiveUntil) {
    events.push({
      date: formatDate(period.effectiveUntil),
      type: 'REPEALED',
      label: 'Berakhir berlaku',
      note: null,
    });
  }
  return events.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}
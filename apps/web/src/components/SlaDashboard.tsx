import { useMemo } from 'react';
import type { Hearing } from '../types';
import { Badge, Card, EmptyState } from './ui';

const DAY = 86_400_000;

export function SlaDashboard({ hearings }: { hearings: Hearing[] }) {
  const items = useMemo(
    () =>
      hearings.map((hearing) => {
        const days = Math.ceil((new Date(hearing.startsAt).getTime() - Date.now()) / DAY);
        return {
          hearing,
          days,
          tone: days < 0 ? 'danger' : days <= 3 ? 'warning' : 'success',
          label: days < 0 ? 'Terlewat' : days <= 3 ? 'Perlu perhatian' : 'Sesuai SLA',
        } as const;
      }),
    [hearings],
  );
  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Kesehatan proses
        </p>
        <h2 className="mt-1 text-lg font-bold">Ringkasan SLA</h2>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Belum ada data SLA"
          description="Status muncul setelah jadwal sidang dibuat."
        />
      ) : (
        <div className="grid gap-3">
          {items.slice(0, 5).map(({ hearing, days, tone, label }) => (
            <div
              key={hearing.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{hearing.case.caseNumber}</p>
                <p className="text-xs text-[var(--muted)]">
                  {days < 0 ? `${Math.abs(days)} hari terlewat` : `${days} hari lagi`}
                </p>
              </div>
              <Badge tone={tone}>{label}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

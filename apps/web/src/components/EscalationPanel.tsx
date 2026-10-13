import { useMemo } from 'react';
import type { Hearing } from '../types';
import { Badge, Card, EmptyState } from './ui';

export function EscalationPanel({ hearings }: { hearings: Hearing[] }) {
  const escalations = useMemo(
    () =>
      hearings.filter(
        (hearing) =>
          hearing.status !== 'COMPLETED' && new Date(hearing.endsAt).getTime() < Date.now(),
      ),
    [hearings],
  );
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Pengawasan
          </p>
          <h2 className="mt-1 text-lg font-bold">Eskalasi aktif</h2>
        </div>
        <Badge tone={escalations.length ? 'danger' : 'success'}>{escalations.length}</Badge>
      </div>
      {escalations.length === 0 ? (
        <EmptyState
          title="Tidak ada eskalasi"
          description="Semua agenda masih berada dalam batas waktu."
        />
      ) : (
        <div className="grid gap-3">
          {escalations.map((hearing) => (
            <div
              className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3"
              key={hearing.id}
            >
              <strong className="text-sm">{hearing.case.caseNumber}</strong>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Agenda melewati waktu selesai dan membutuhkan tindak lanjut.
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

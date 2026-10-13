import { useMemo } from 'react';
import type { Hearing } from '../types';
import { Badge, Card, EmptyState } from './ui';

export function ConflictDetector({ hearings }: { hearings: Hearing[] }) {
  const conflicts = useMemo(() => {
    const result: Array<{ first: Hearing; second: Hearing }> = [];
    hearings.forEach((first, index) =>
      hearings.slice(index + 1).forEach((second) => {
        const overlaps =
          first.courtroom === second.courtroom &&
          new Date(first.startsAt).getTime() < new Date(second.endsAt).getTime() &&
          new Date(second.startsAt).getTime() < new Date(first.endsAt).getTime();
        if (overlaps) result.push({ first, second });
      }),
    );
    return result;
  }, [hearings]);
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Validasi otomatis
          </p>
          <h2 className="mt-1 text-lg font-bold">Bentrok jadwal</h2>
        </div>
        <Badge tone={conflicts.length ? 'danger' : 'success'}>{conflicts.length || 'Aman'}</Badge>
      </div>
      {conflicts.length === 0 ? (
        <EmptyState
          title="Tidak ada bentrok"
          description="Ruang sidang dan waktu seluruh agenda sudah aman."
        />
      ) : (
        <div className="grid gap-3">
          {conflicts.map(({ first, second }) => (
            <div
              key={`${first.id}-${second.id}`}
              className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm"
            >
              <strong>{first.courtroom}</strong>
              <p className="mt-1 text-[var(--muted)]">
                {first.case.caseNumber} berbenturan dengan {second.case.caseNumber}.
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

import type { Hearing } from '../types';
import { Badge, Card, EmptyState } from './ui';

const statusMap = {
  SCHEDULED: ['Terjadwal', 'info'],
  COMPLETED: ['Selesai', 'success'],
  POSTPONED: ['Ditunda', 'warning'],
  CANCELLED: ['Dibatalkan', 'danger'],
} as const;

export function HearingList({
  hearings,
  selectedId,
  onSelect,
}: {
  hearings: Hearing[];
  selectedId?: string;
  onSelect: (hearing: Hearing) => void;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Daftar agenda
          </p>
          <h2 className="mt-1 text-xl font-bold">Sidang mendatang</h2>
        </div>
        <span className="text-sm text-[var(--muted)]">{hearings.length} jadwal</span>
      </div>
      {hearings.length === 0 ? (
        <EmptyState
          title="Belum ada jadwal"
          description="Buat jadwal pertama untuk mulai memantau agenda."
        />
      ) : (
        <div className="grid gap-3">
          {hearings.map((hearing) => {
            const [label, tone] = statusMap[hearing.status];
            return (
              <button
                type="button"
                key={hearing.id}
                onClick={() => onSelect(hearing)}
                className={`grid w-full gap-3 rounded-xl border p-4 text-left transition sm:grid-cols-[8rem_1fr_auto] ${selectedId === hearing.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] hover:border-[var(--accent)]/60'}`}
              >
                <time className="text-sm font-semibold" dateTime={hearing.startsAt}>
                  {new Date(hearing.startsAt).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  <span className="block text-xs font-normal text-[var(--muted)]">
                    {new Date(hearing.startsAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </time>
                <span className="min-w-0">
                  <strong className="block truncate">{hearing.case.caseNumber}</strong>
                  <span className="block truncate text-sm text-[var(--muted)]">
                    {hearing.case.title}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {hearing.courtroom} · {hearing.judgeName}
                  </span>
                </span>
                <span>
                  <Badge tone={tone}>{label}</Badge>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

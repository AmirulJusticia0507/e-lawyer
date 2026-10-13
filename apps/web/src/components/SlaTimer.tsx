import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import type { HearingSla } from '../types';
import { Badge, Card, EmptyState } from './ui';

export function SlaTimer({ hearingId }: { hearingId: string }) {
  const [timers, setTimers] = useState<HearingSla[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .listSlaTimers(hearingId)
      .then(setTimers)
      .catch((reason) =>
        setError(reason instanceof ApiError ? reason.message : 'Gagal memuat SLA'),
      );
  }, [hearingId]);
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Tahapan SLA</h2>
      {error && <p className="mb-3 text-sm text-rose-500">{error}</p>}
      {timers.length === 0 ? (
        <EmptyState
          title="Belum ada timer"
          description="Timer dibuat otomatis saat agenda disimpan."
        />
      ) : (
        <div className="grid gap-3">
          {timers.map((timer) => (
            <div
              key={timer.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
            >
              <div>
                <strong className="text-sm">{timer.label}</strong>
                <p className="text-xs text-[var(--muted)]">
                  Batas {new Date(timer.deadlineAt).toLocaleString('id-ID')}
                </p>
              </div>
              <Badge
                tone={
                  timer.status === 'BREACHED'
                    ? 'danger'
                    : timer.status === 'AT_RISK'
                      ? 'warning'
                      : timer.status === 'COMPLETED'
                        ? 'success'
                        : 'info'
                }
              >
                {timer.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

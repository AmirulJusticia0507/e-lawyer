import { useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import type { Reminder } from '../types';
import { Badge, Card, EmptyState } from './ui';

export function ReminderPanel({ hearingId }: { hearingId?: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!hearingId) {
      setReminders([]);
      return;
    }
    api
      .listReminders(hearingId)
      .then(setReminders)
      .catch((reason) =>
        setError(reason instanceof ApiError ? reason.message : 'Gagal memuat pengingat'),
      );
  }, [hearingId]);
  return (
    <Card>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Notifikasi
        </p>
        <h2 className="mt-1 text-lg font-bold">Pengingat sidang</h2>
      </div>
      {error && <p className="mb-3 text-sm text-rose-500">{error}</p>}
      {!hearingId ? (
        <EmptyState
          title="Pilih agenda"
          description="Klik agenda untuk melihat pengingat otomatisnya."
        />
      ) : reminders.length === 0 ? (
        <EmptyState
          title="Belum ada pengingat"
          description="Pengingat H-7, H-3, dan H-1 dibuat otomatis."
        />
      ) : (
        <div className="grid gap-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
            >
              <div>
                <strong className="text-sm">{reminder.type}</strong>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(reminder.triggerAt).toLocaleString('id-ID')}
                </p>
              </div>
              <Badge
                tone={
                  reminder.status === 'SENT'
                    ? 'success'
                    : reminder.status === 'FAILED'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {reminder.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Button, Card, Badge, EmptyState } from '../components/ui';
import type { TimeEntry } from '../types';

export default function BillingDashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.listTimeEntries({ userId: user?.id })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Gagal memuat data keuangan');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const totalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0),
    [entries],
  );
  const totalAmount = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
    [entries],
  );
  const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Operasional firma</p>
        <h1 className="mt-2 text-2xl font-bold">Keuangan & Timesheet</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pantau waktu kerja dan nilai jasa yang tercatat untuk setiap perkara.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-600" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{entries.length}</div>
          <div className="text-xs text-[var(--muted)]">Entri Waktu</div>
        </Card>
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}</div>
          <div className="text-xs text-[var(--muted)]">Jam Tercatat</div>
        </Card>
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{rupiah.format(totalAmount)}</div>
          <div className="text-xs text-[var(--muted)]">Nilai Jasa</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Aktivitas Terbaru</p>
            <h2 className="mt-1 text-xl font-bold">Timesheet</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="info">{entries.length} entri</Badge>
            <Button variant="ghost" size="sm" disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[var(--muted)]">Memuat data…</div>
        ) : entries.length === 0 ? (
          <EmptyState title="Belum ada timesheet" description="Entri waktu kerja akan muncul di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3">Perkara</th>
                  <th className="px-4 py-3">Aktivitas</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-4 py-4 font-medium">{entry.case?.caseNumber ?? '—'}</td>
                    <td className="px-4 py-4 text-[var(--muted)]">{entry.description ?? 'Tanpa deskripsi'}</td>
                    <td className="px-4 py-4">{entry.durationMinutes ?? 0} menit</td>
                    <td className="px-4 py-4 text-right">{rupiah.format(entry.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Badge, Card, EmptyState } from '../components/ui';

interface TimeEntry {
  id: string;
  description?: string;
  durationMinutes?: number;
  hourlyRate?: number;
  amount?: number;
  case?: { caseNumber: string };
}

export function BillingDashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/billing/time-entries?userId=${encodeURIComponent(user?.id ?? '')}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Gagal memuat data keuangan');
        return response.json() as Promise<TimeEntry[]>;
      })
      .then(setEntries)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError'))
          setError(reason instanceof Error ? reason.message : 'Gagal memuat data keuangan');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
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
    <div className="grid gap-6 pb-10">
      <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          Operasional firma
        </p>
        <h1 className="mt-2 text-3xl font-bold">Keuangan & timesheet</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pantau waktu kerja dan nilai jasa yang tercatat untuk setiap perkara.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Entri waktu" value={String(entries.length)} />
          <Metric label="Jam tercatat" value={(totalMinutes / 60).toFixed(1)} />
          <Metric label="Nilai jasa" value={rupiah.format(totalAmount)} />
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600"
        >
          {error}
        </div>
      )}
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Aktivitas terbaru
            </p>
            <h2 className="mt-1 text-xl font-bold">Timesheet</h2>
          </div>
          <Badge tone="info">{entries.length} entri</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Memuat data…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="Belum ada timesheet"
            description="Entri waktu kerja akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-3">Perkara</th>
                  <th className="px-3 py-3">Aktivitas</th>
                  <th className="px-3 py-3">Durasi</th>
                  <th className="px-3 py-3 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr className="border-b border-[var(--border)] last:border-0" key={entry.id}>
                    <td className="px-3 py-4 font-semibold">{entry.case?.caseNumber ?? '—'}</td>
                    <td className="px-3 py-4 text-[var(--muted)]">
                      {entry.description ?? 'Tanpa deskripsi'}
                    </td>
                    <td className="px-3 py-4">{entry.durationMinutes ?? 0} menit</td>
                    <td className="px-3 py-4 text-right">{rupiah.format(entry.amount ?? 0)}</td>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--bg)]/70 p-4">
      <strong className="block text-xl">{value}</strong>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

export default BillingDashboard;

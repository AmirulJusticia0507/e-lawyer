import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Badge, EmptyState } from '../components/ui';
import type { HearingSla, SlaStatistics } from '../types';

const statusLabels: Record<string, string> = {
  ON_TRACK: 'Sesuai',
  AT_RISK: 'Risiko',
  BREACHED: 'Terlambat',
  COMPLETED: 'Selesai',
};

const stageLabels: Record<string, string> = {
  PERSIANGAN: 'Persiapan & Sidang',
  PEMBUKTIAN: 'Pembuktian',
  PEMBAHASAN: 'Pembahasan',
  PUTUSAN: 'Putusan',
};

const PAGE_SIZE = 10;

export default function SlaDashboard() {
  const { user } = useAuth();
  const canUpdate = user?.permissions.includes('UPDATE:HEARING') ?? false;
  const [stats, setStats] = useState<SlaStatistics | null>(null);
  const [timers, setTimers] = useState<HearingSla[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsResult, timersResult] = await Promise.all([
        api.slaStatistics(),
        api.listAllSlaTimers(),
      ]);
      setStats(statsResult);
      const allTimers = timersResult;
      setTotal(allTimers.length);
      const start = (page - 1) * PAGE_SIZE;
      setTimers(allTimers.slice(start, start + PAGE_SIZE));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat data SLA');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const sweep = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.slaSweep();
      setNotice(`Sweep selesai: ${result.breached} terlambat, ${result.atRisk} risiko.`);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal menjalankan sweep');
    } finally {
      setBusy(false);
    }
  };

  const advance = async (hearingId: string, stage: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.advanceSlaStage(hearingId, stage as HearingSla['stage']);
      setNotice(`Tahapan "${stageLabels[stage] ?? stage}" ditandai selesai.`);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memajukan tahapan');
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">SLA Timer</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pantau batas waktu tiap tahapan persidangan; alert otomatis saat mendekati/melewati batas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load} disabled={busy}>Muat ulang</Button>
          {canUpdate && <Button onClick={sweep} disabled={busy}>{busy ? 'Memproses…' : 'Jalankan sweep'}</Button>}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">
          {notice}
        </div>
      )}

      {stats && (
        <Card>
          <h2 className="text-xl font-bold">Ringkasan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatBox label="Total timer" value={stats.total} />
            {stats.byStatus.map((s) => (
              <StatBox key={s.status} label={statusLabels[s.status] ?? s.status} value={s.count} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold">Aktivitas Terbaru</h2>
        {!stats || stats.recentAlerts.length === 0 ? (
          <EmptyState title="Belum ada alert SLA" description="Alert akan muncul di sini saat timer mendekati atau melewati batas waktu." />
        ) : (
          <div className="mt-4 space-y-3">
            {stats.recentAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border p-4 ${getAlertBorder(alert.level)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-[var(--text)]">
                      {alert.level === 'BREACHED' ? 'Terlambat' : 'Risiko'}
                    </strong>
                    <span className="ml-2 text-sm text-[var(--muted)]">{alert.slaTimer.hearing.case.caseNumber}</span>
                  </div>
                  <Badge tone={alert.level === 'BREACHED' ? 'danger' : 'warning'}>{alert.level}</Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{alert.message}</p>
                <time className="block mt-2 text-xs text-[var(--muted)]" dateTime={alert.triggeredAt}>
                  {new Date(alert.triggeredAt).toLocaleString('id-ID')}
                </time>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-bold">Daftar Timer Aktif</h2>
          <div className="text-sm text-[var(--muted)]">
            Menampilkan {startItem}–{endItem} dari {total} timer
          </div>
        </div>

        {timers.length === 0 ? (
          <EmptyState
            title="Belum ada timer SLA"
            description="Timer dibuat otomatis saat jadwal sidang disimpan."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">Timer</th>
                    <th className="px-4 py-3">Perkara</th>
                    <th className="px-4 py-3">Tahapan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Mulai</th>
                    <th className="px-4 py-3">Batas</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {timers.map((timer) => (
                    <tr key={timer.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-4 font-medium text-[var(--text)]">{timer.label}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{timer.hearing?.case?.caseNumber ?? timer.hearingId}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{stageLabels[timer.stage] ?? timer.stage}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getStatusTone(timer.status)}>
                          {statusLabels[timer.status] ?? timer.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{new Date(timer.startedAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{new Date(timer.deadlineAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        {canUpdate && timer.status !== 'COMPLETED' && timer.status !== 'BREACHED' && (
                          <Button
                            size="sm"
                            onClick={() => advance(timer.hearingId, timer.stage)}
                            disabled={busy}
                          >
                            Tandai selesai
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-[var(--muted)]">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--bg)]/70 p-4">
      <strong className="block text-2xl font-bold text-[var(--text)]">{value}</strong>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

function getStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'ON_TRACK':
      return 'success';
    case 'AT_RISK':
      return 'warning';
    case 'BREACHED':
      return 'danger';
    case 'COMPLETED':
      return 'info';
    default:
      return 'neutral';
  }
}

function getAlertBorder(level: string): string {
  switch (level) {
    case 'BREACHED':
      return 'border-rose-500/30 bg-rose-500/5';
    case 'AT_RISK':
      return 'border-amber-500/30 bg-amber-500/5';
    default:
      return 'border-[var(--border)] bg-[var(--surface-2)]/50';
  }
}
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

export default function SlaDashboard() {
  const { user } = useAuth();
  const canUpdate = user?.permissions.includes('UPDATE:HEARING') ?? false;
  const [stats, setStats] = useState<SlaStatistics | null>(null);
  const [timers, setTimers] = useState<HearingSla[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsResult, timersResult] = await Promise.all([
        api.slaStatistics(),
        api.listSlaTimers(''),
      ]);
      setStats(statsResult);
      setTimers(timersResult);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat data SLA');
    }
  }, []);

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
        <h2 className="text-xl font-bold">Daftar Timer Aktif</h2>
        {timers.length === 0 ? (
          <EmptyState
            title="Belum ada timer SLA"
            description="Timer dibuat otomatis saat jadwal sidang disimpan."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {timers.map((timer) => (
              <article key={timer.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <strong className="text-[var(--text)]">{timer.label}</strong>
                    <Badge tone={getStatusTone(timer.status)}>
                      {statusLabels[timer.status] ?? timer.status}
                    </Badge>
                  </div>
                  {canUpdate && timer.status !== 'COMPLETED' && timer.status !== 'BREACHED' && (
                    <Button size="sm" onClick={() => advance(timer.hearingId, timer.stage)} disabled={busy}>
                      Tandai selesai
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  <span>Mulai: {new Date(timer.startedAt).toLocaleString('id-ID')}</span>
                  <span>Batas: {new Date(timer.deadlineAt).toLocaleString('id-ID')}</span>
                  {timer.completedAt && <span>Selesai: {new Date(timer.completedAt).toLocaleString('id-ID')}</span>}
                </div>
              </article>
            ))}
          </div>
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
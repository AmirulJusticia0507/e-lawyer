import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
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
    <div>
      <div className="page-heading">
        <div>
          <h1>SLA Timer</h1>
          <p className="muted">Pantau batas waktu tiap tahapan persidangan; alert otomatis saat mendekati/melewati batas.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => void load()} disabled={busy}>Muat ulang</button>
          {canUpdate && <button className="btn" onClick={() => void sweep()} disabled={busy}>{busy ? 'Memproses…' : 'Jalankan sweep'}</button>}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {stats && (
        <section className="card">
          <h2>Ringkasan</h2>
          <div className="grid-4">
            <div className="stat-box"><span className="stat-value">{stats.total}</span><span className="muted">Total timer</span></div>
            {stats.byStatus.map((s) => (
              <div className="stat-box" key={s.status}>
                <span className="stat-value">{s.count}</span>
                <span className="muted">{statusLabels[s.status] ?? s.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Aktivitas terbaru</h2>
        {!stats || stats.recentAlerts.length === 0 ? (
          <p className="muted">Belum ada alert SLA.</p>
        ) : (
          <div className="sla-alert-list">
            {stats.recentAlerts.map((alert) => (
              <div className={`sla-alert-item level-${alert.level.toLowerCase()}`} key={alert.id}>
                <div><strong>{alert.level === 'BREACHED' ? 'Terlambat' : 'Risiko'}</strong><span>{alert.slaTimer.hearing.case.caseNumber}</span></div>
                <p className="muted">{alert.message}</p>
                <time dateTime={alert.triggeredAt}>{new Date(alert.triggeredAt).toLocaleString('id-ID')}</time>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Daftar timer aktif</h2>
        {timers.length === 0 ? (
          <p className="muted">Belum ada timer SLA. Timer dibuat otomatis saat jadwal sidang disimpan.</p>
        ) : (
          <div className="sla-timer-list">
            {timers.map((timer) => (
              <article className={`sla-timer-item status-${timer.status.toLowerCase()}`} key={timer.id}>
                <div className="sla-timer-header">
                  <strong>{timer.label}</strong>
                  <span className={`badge badge-${timer.status.toLowerCase()}`}>{statusLabels[timer.status] ?? timer.status}</span>
                </div>
                <div className="muted">
                  <span>Mulai: {new Date(timer.startedAt).toLocaleString('id-ID')}</span>
                  <span>Batas: {new Date(timer.deadlineAt).toLocaleString('id-ID')}</span>
                  {timer.completedAt && <span>Selesai: {new Date(timer.completedAt).toLocaleString('id-ID')}</span>}
                </div>
                {canUpdate && timer.status !== 'COMPLETED' && timer.status !== 'BREACHED' && (
                  <button className="btn btn-sm" onClick={() => advance(timer.hearingId, timer.stage)} disabled={busy}>
                    Tandai selesai
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

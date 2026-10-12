import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import type { CaseSummary, Hearing, HearingSla, SlaStatus } from '../types';

function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function weekRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

function slaStatusLabel(status: SlaStatus): string {
  const labels: Record<SlaStatus, string> = {
    ON_TRACK: 'Sesuai',
    AT_RISK: 'Risiko',
    BREACHED: 'Terlambat',
    COMPLETED: 'Selesai',
  };
  return labels[status] || status;
}

export default function Hearings() {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('CREATE:HEARING') ?? false;
  const canUpdate = user?.permissions.includes('UPDATE:HEARING') ?? false;
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [form, setForm] = useState({
    caseId: '',
    startsAt: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
    endsAt: toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    courtroom: '',
    judgeName: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const range = weekRange();
    const [caseResult, hearingResult] = await Promise.all([
      api.listCases({ limit: 100 }),
      api.listHearings(range),
    ]);
    setCases(caseResult.items);
    setHearings(hearingResult);
    if (!form.caseId && caseResult.items[0]) setForm((current) => ({ ...current, caseId: caseResult.items[0].id }));
  }, [form.caseId]);

  useEffect(() => {
    void load().catch((reason: unknown) =>
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat jadwal sidang'),
    );
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.createHearing({
        caseId: form.caseId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        courtroom: form.courtroom,
        judgeName: form.judgeName,
        notes: form.notes || undefined,
      });
      setNotice('Jadwal sidang berhasil dicatat. Timer SLA dibuat otomatis.');
      void load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal membuat jadwal sidang');
    } finally {
      setBusy(false);
    }
  };

  const requestPostponement = async (hearingId: string) => {
    const reason = prompt('Alasan permohonan penundaan:');
    if (!reason) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.requestPostponement(hearingId, { reason });
      setNotice('Permohonan penundaan dikirim ke hakim.');
      void load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal mengirim permohonan penundaan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Jadwal Sidang</h1>
          <p className="muted">Agenda tujuh hari ke depan; bentrok ruang, hakim, dan pihak perkara diperiksa saat jadwal dibuat.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => void load()} disabled={busy}>Muat ulang</button>
          {canCreate && (
            <button className="btn" onClick={() => void create()} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan jadwal'}
            </button>
          )}
          {canUpdate && (
            <button className="btn btn-danger" onClick={() => requestPostponement('')}>
              Ajukan Penundaan
            </button>
          )}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <section className="card">
        <h2>Agenda tujuh hari ke depan</h2>
        {hearings.length === 0 ? (
          <p className="muted">Belum ada jadwal sidang dalam rentang ini.</p> : (
          <div className="hearing-list">
            {hearings.map((hearing) => {
              const slaStatus = 'ON_TRACK'; // placeholder - in real app would fetch per hearing
              
              return (
                <article className="hearing-item" key={hearing.id}>
                  <time className="hearing-time" dateTime={hearing.startsAt}>
                    {new Date(hearing.startsAt).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(hearing.endsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  <div><strong>{hearing.case.caseNumber}</strong><span>{hearing.case.title}</span></div>
                  <div><span>{hearing.judgeName}</span><span className="muted">{hearing.courtroom}</span></div>
                  {hearing.notes && <p className="muted">{hearing.notes}</p>}
                  <div className="sla-status">
                    <span className="badge">{slaStatusLabel(slaStatus)}</span>
                  </div>
                  {canUpdate && (
                    <button className="btn btn-sm btn-danger" onClick={() => requestPostponement(hearing.id)}>
                      Ajukan Penundaan
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
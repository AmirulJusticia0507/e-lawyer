import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import type { CaseSummary, Hearing } from '../types';

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

export default function Hearings() {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('CREATE:HEARING') ?? false;
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
      setNotice('Jadwal sidang berhasil dicatat.');
      void load().catch((reason: unknown) =>
        setError(reason instanceof ApiError ? reason.message : 'Jadwal tersimpan, tetapi agenda gagal dimuat ulang'),
      );
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal membuat jadwal sidang');
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
        <button
          className="btn btn-ghost"
          onClick={() => void load().catch((reason: unknown) =>
            setError(reason instanceof ApiError ? reason.message : 'Gagal memuat ulang agenda'),
          )}
          disabled={busy}
        >
          Muat ulang
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {canCreate && (
        <section className="card hearing-create">
          <h2>Catat jadwal sidang</h2>
          <form className="grid-2" onSubmit={(event) => void create(event)}>
            <div className="field">
              <label htmlFor="hearing-case">Perkara</label>
              <select id="hearing-case" className="select" value={form.caseId} onChange={(event) => setForm({ ...form, caseId: event.target.value })} required>
                <option value="">Pilih perkara</option>
                {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} — {item.title}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hearing-room">Ruang sidang</label>
              <input id="hearing-room" className="input" value={form.courtroom} onChange={(event) => setForm({ ...form, courtroom: event.target.value })} required maxLength={160} />
            </div>
            <div className="field">
              <label htmlFor="hearing-judge">Nama hakim</label>
              <input id="hearing-judge" className="input" value={form.judgeName} onChange={(event) => setForm({ ...form, judgeName: event.target.value })} required maxLength={160} />
            </div>
            <div className="field">
              <label htmlFor="hearing-start">Mulai</label>
              <input id="hearing-start" className="input" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="hearing-end">Selesai</label>
              <input id="hearing-end" className="input" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="hearing-notes">Catatan (opsional)</label>
              <input id="hearing-notes" className="input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={2000} />
            </div>
            <button className="btn" type="submit" disabled={busy || !form.caseId}>{busy ? 'Menyimpan…' : 'Simpan jadwal'}</button>
          </form>
        </section>
      )}
      <section className="card">
        <h2>Agenda tujuh hari ke depan</h2>
        {hearings.length === 0 ? <p className="muted">Belum ada jadwal sidang dalam rentang ini.</p> : (
          <div className="hearing-list">
            {hearings.map((hearing) => (
              <article className="hearing-item" key={hearing.id}>
                <time className="hearing-time" dateTime={hearing.startsAt}>
                  {new Date(hearing.startsAt).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(hearing.endsAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </time>
                <div><strong>{hearing.case.caseNumber}</strong><span>{hearing.case.title}</span></div>
                <div><span>{hearing.judgeName}</span><span className="muted">{hearing.courtroom}</span></div>
                {hearing.notes && <p className="muted">{hearing.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  api,
  anomalySeverityLabels,
  anomalyStatusLabels,
  anomalyTypeLabels,
  deadlineStatusLabels,
  integrityCheckLabels,
  integrityEntityLabels,
  receiptStatusLabels,
} from '../api';
import type { CaseIntegrity, IntegrityCheckResult } from '../types';

function resultBadge(result: IntegrityCheckResult | null) {
  if (!result) return <span className="badge">Belum Diverifikasi</span>;
  return <span className={`badge badge-${result === 'MATCH' ? 'ACTIVE' : 'NEW'}`}>{integrityCheckLabels[result]}</span>;
}

export default function IntegrityPanel({ caseId }: { caseId: string }) {
  const [data, setData] = useState<CaseIntegrity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addendum, setAddendum] = useState({ recordId: '', title: '', content: '' });
  const [receipt, setReceipt] = useState({ recordId: '', recipientPartyId: '' });
  const [deadline, setDeadline] = useState({ label: '', dueAt: '' });
  const [extend, setExtend] = useState<{ id: string; reason: string; dueAt: string } | null>(null);

  const load = useCallback(() => {
    api
      .caseIntegrity(caseId)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat integritas'));
  }, [caseId]);

  useEffect(load, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses');
    } finally {
      setBusy(false);
    }
  };

  const verify = (recordId: string) => run(() => api.verifyIntegrity(recordId));

  const submitAddendum = (e: FormEvent) => {
    e.preventDefault();
    if (!addendum.recordId || !addendum.title || !addendum.content) return;
    void run(() => api.createAddendum(caseId, addendum)).then(() =>
      setAddendum({ recordId: '', title: '', content: '' }),
    );
  };

  const submitReceipt = (e: FormEvent) => {
    e.preventDefault();
    if (!receipt.recordId || !receipt.recipientPartyId) return;
    void run(() => api.createReceipt(caseId, receipt)).then(() =>
      setReceipt({ recordId: '', recipientPartyId: '' }),
    );
  };

  const submitDeadline = (e: FormEvent) => {
    e.preventDefault();
    if (!deadline.label || !deadline.dueAt) return;
    void run(() => api.createDeadline(caseId, deadline)).then(() =>
      setDeadline({ label: '', dueAt: '' }),
    );
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Memuat integritas...</p>;

  return (
    <div className="card">
      <h3>Integritas & Anti-Manipulasi</h3>

      <h4>Berkekas Tercatat</h4>
      {data.records.length === 0 ? (
        <p className="muted">Belum ada record integritas untuk perkara ini.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>SHA-256</th>
              <th>Status</th>
              <th>Dicatat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id}>
                <td>{integrityEntityLabels[r.entityType]}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {r.sha256.slice(0, 16)}...
                </td>
                <td>{resultBadge(r.latestCheck?.result ?? null)}</td>
                <td className="muted">{new Date(r.createdAt).toLocaleString('id-ID')}</td>
                <td>
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => verify(r.id)}
                  >
                    Verifikasi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4 style={{ marginTop: '1.5rem' }}>Tenggat</h4>
      {data.deadlines.length === 0 ? (
        <p className="muted">Belum ada tenggat.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Tenggat</th>
              <th>Status</th>
              <th>Perpanjangan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.deadlines.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td>{new Date(d.dueAt).toLocaleString('id-ID')}</td>
                <td>
                  <span className="badge">{deadlineStatusLabels[d.status]}</span>
                </td>
                <td>
                  {d.extensionCount}x
                  {d.lastExtensionReason && (
                    <div className="muted" style={{ fontSize: '0.75rem' }}>
                      {d.lastExtensionReason}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {d.status === 'OPEN' && (
                    <>
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => setExtend({ id: d.id, reason: '', dueAt: '' })}
                      >
                        Undur
                      </button>{' '}
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => void run(() => api.completeDeadline(d.id))}
                      >
                        Selesai
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {extend && (
        <form
          className="grid-2"
          style={{ marginTop: '0.5rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!extend.reason || !extend.dueAt) return;
            void run(() => api.extendDeadline(extend.id, { reason: extend.reason, dueAt: extend.dueAt })).then(
              () => setExtend(null),
            );
          }}
        >
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Alasan Perpanjangan (wajib)</label>
            <input
              className="input"
              value={extend.reason}
              onChange={(e) => setExtend({ ...extend, reason: e.target.value })}
              required
              minLength={5}
              placeholder="Mis. Menunggu dokumen dari klien"
            />
          </div>
          <div className="field">
            <label>Tenggat Baru</label>
            <input
              className="input"
              type="datetime-local"
              value={extend.dueAt}
              onChange={(e) => setExtend({ ...extend, dueAt: e.target.value })}
              required
            />
          </div>
          <div style={{ alignSelf: 'end', display: 'flex', gap: '0.5rem' }}>
            <button className="btn" type="submit" disabled={busy}>
              Simpan
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setExtend(null)}>
              Batal
            </button>
          </div>
        </form>
      )}
      <form onSubmit={submitDeadline} className="grid-2" style={{ marginTop: '0.75rem' }}>
        <div className="field">
          <label>Label Tenggat</label>
          <input
            className="input"
            value={deadline.label}
            onChange={(e) => setDeadline({ ...deadline, label: e.target.value })}
            required
            placeholder="Mis. Jawaban tergugat"
          />
        </div>
        <div className="field">
          <label>Batas Waktu</label>
          <input
            className="input"
            type="datetime-local"
            value={deadline.dueAt}
            onChange={(e) => setDeadline({ ...deadline, dueAt: e.target.value })}
            required
          />
        </div>
        <div>
          <button className="btn" type="submit" disabled={busy}>
            Tambah Tenggat
          </button>
        </div>
      </form>

      <h4 style={{ marginTop: '1.5rem' }}>Salinan Resmi (Dual-Confirmation)</h4>
      {data.receipts.length === 0 ? (
        <p className="muted">Belum ada salinan resmi terkirim.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Penerima</th>
              <th>Status</th>
              <th>Terakhir</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.receipts.map((r) => (
              <tr key={r.id}>
                <td>{r.recipientParty.name}</td>
                <td>
                  <span className="badge">{receiptStatusLabels[r.status]}</span>
                  {r.confirmNote && (
                    <div className="muted" style={{ fontSize: '0.75rem' }}>
                      {r.confirmNote}
                    </div>
                  )}
                </td>
                <td className="muted">
                  {new Date(r.confirmedAt ?? r.sentAt).toLocaleString('id-ID')}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.status === 'SENT' && (
                    <>
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void run(() => api.confirmReceipt(r.id, 'Diterima via panel'))
                        }
                      >
                        Konfirmasi Terima
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={busy}
                        onClick={() => {
                          const note = window.prompt('Alasan sanggahan:');
                          if (note) void run(() => api.disputeReceipt(r.id, note));
                        }}
                      >
                        Sanggah
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={submitReceipt} className="grid-2" style={{ marginTop: '0.75rem' }}>
        <div className="field">
          <label>Record Dokumen</label>
          <select
            className="select"
            value={receipt.recordId}
            onChange={(e) => setReceipt({ ...receipt, recordId: e.target.value })}
            required
          >
            <option value="">- pilih record -</option>
            {data.records.map((r) => (
              <option key={r.id} value={r.id}>
                {integrityEntityLabels[r.entityType]} {r.sha256.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>ID Pihak Penerima</label>
          <input
            className="input"
            value={receipt.recipientPartyId}
            onChange={(e) => setReceipt({ ...receipt, recipientPartyId: e.target.value })}
            required
            placeholder="UUID pihak pada perkara ini"
          />
        </div>
        <div>
          <button className="btn" type="submit" disabled={busy}>
            Kirim Salinan Resmi
          </button>
        </div>
      </form>

      <h4 style={{ marginTop: '1.5rem' }}>Addendum (Revisi Immutable)</h4>
      {data.addenda.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Judul</th>
              <th>Penulis</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {data.addenda.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.author?.fullName ?? '-'}</td>
                <td className="muted">{new Date(a.createdAt).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={submitAddendum} className="grid-2" style={{ marginTop: '0.75rem' }}>
        <div className="field">
          <label>Record Dasar</label>
          <select
            className="select"
            value={addendum.recordId}
            onChange={(e) => setAddendum({ ...addendum, recordId: e.target.value })}
            required
          >
            <option value="">- pilih record -</option>
            {data.records.map((r) => (
              <option key={r.id} value={r.id}>
                {integrityEntityLabels[r.entityType]} {r.sha256.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Judul Addendum</label>
          <input
            className="input"
            value={addendum.title}
            onChange={(e) => setAddendum({ ...addendum, title: e.target.value })}
            required
            placeholder="Mis. Koreksi lampiran II"
          />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Isi Addendum</label>
          <textarea
            className="input"
            rows={3}
            value={addendum.content}
            onChange={(e) => setAddendum({ ...addendum, content: e.target.value })}
            required
          />
        </div>
        <div>
          <button className="btn" type="submit" disabled={busy}>
            Tambah Addendum
          </button>
        </div>
      </form>

      <h4 style={{ marginTop: '1.5rem' }}>Flag Anomali</h4>
      {data.anomalies.length === 0 ? (
        <p className="muted">Tidak ada anomali tercatat. Semua berjalan normal.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Pesan</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {data.anomalies.map((a) => (
              <tr key={a.id}>
                <td>{anomalyTypeLabels[a.type]}</td>
                <td>{anomalySeverityLabels[a.severity]}</td>
                <td>
                  <span className="badge">{anomalyStatusLabels[a.status]}</span>
                </td>
                <td style={{ maxWidth: 320 }}>{a.message}</td>
                <td className="muted">{new Date(a.createdAt).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

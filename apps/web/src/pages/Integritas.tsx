import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  anomalySeverityLabels,
  anomalyStatusLabels,
  anomalyTypeLabels,
} from '../api';
import type { AnomalyFlag, AnomalyStatus, Paginated } from '../types';

const STATUSES: (AnomalyStatus | '')[] = ['', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];

export default function Integritas() {
  const [data, setData] = useState<Paginated<AnomalyFlag> | null>(null);
  const [status, setStatus] = useState<AnomalyStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .listAnomalies({ status: status || undefined, limit: 50 })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat anomali'));
  }, [status]);

  useEffect(load, [load]);

  const update = (id: string, next: AnomalyStatus) => {
    const note =
      next === 'DISMISSED'
        ? window.prompt('Alasan pengabaian:') ?? undefined
        : undefined;
    setBusy(true);
    api
      .resolveAnomaly(id, { status: next, note })
      .then(load)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memperbarui'))
      .finally(() => setBusy(false));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    load();
  };

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Integritas & Anti-Manipulasi</h1>
      <p className="muted">
        Monitoring anomali integritas lintas perkara: upload mendadak, tanggal mundur
        mencurigakan, perubahan klaim, pola penundaan, hash berubah, dan tenggat terlampaui.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
        <div className="field">
          <label>Status</label>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as AnomalyStatus | '')}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? anomalyStatusLabels[s] : 'Semua'}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {!data || data.items.length === 0 ? (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Tidak ada flag anomali.
        </p>
      ) : (
        <table className="table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Perkara</th>
              <th>Pesan</th>
              <th>Waktu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <tr key={a.id}>
                <td>{anomalyTypeLabels[a.type]}</td>
                <td>{anomalySeverityLabels[a.severity]}</td>
                <td>
                  <span className="badge">{anomalyStatusLabels[a.status]}</span>
                </td>
                <td>
                  {a.case ? (
                    <Link to={`/perkara/${a.case.id}`}>{a.case.caseNumber}</Link>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ maxWidth: 360 }}>
                  {a.message}
                  {a.resolutionNote && (
                    <div className="muted" style={{ fontSize: '0.75rem' }}>
                      Catatan: {a.resolutionNote}
                      {a.resolvedBy ? ` - ${a.resolvedBy.fullName}` : ''}
                    </div>
                  )}
                </td>
                <td className="muted">{new Date(a.createdAt).toLocaleString('id-ID')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {a.status === 'OPEN' && (
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => update(a.id, 'ACKNOWLEDGED')}
                    >
                      Akui
                    </button>
                  )}
                  {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                    <>
                      {' '}
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => update(a.id, 'RESOLVED')}
                      >
                        Selesai
                      </button>{' '}
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={busy}
                        onClick={() => update(a.id, 'DISMISSED')}
                      >
                        Abaikan
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.meta.totalPages > 1 && (
        <p className="muted">
          Halaman {data.meta.page} / {data.meta.totalPages} - total {data.meta.total} flag
        </p>
      )}
    </div>
  );
}

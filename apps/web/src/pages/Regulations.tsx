import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  jurisdictionLabels,
  legalSourceStatusLabels,
  regulationTypeLabels,
} from '../api';
import HighlightSnippet from '../components/HighlightSnippet';
import type {
  Jurisdiction,
  LegalSourceStatus,
  RegulationListItem,
  RegulationType,
  SearchHit,
} from '../types';

const today = () => new Date().toISOString().slice(0, 10);

export default function Regulations() {
  const [items, setItems] = useState<RegulationListItem[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<RegulationType | ''>('');
  const [status, setStatus] = useState<LegalSourceStatus | ''>('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | ''>('');
  const [at, setAt] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    void api
      .listRegulations({
        page,
        limit: 10,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        jurisdiction: jurisdiction || undefined,
        at: at || undefined,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.meta.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat peraturan'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, type, status, jurisdiction, at]);

  const runSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (search.trim().length < 2) {
      setHits([]);
      load();
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchLegalSources({ q: search.trim(), limit: 20, at });
      setHits(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pencarian gagal');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSearch('');
    setHits([]);
    setPage(1);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div>
      <h1>Peraturan &amp; Dasar Hukum</h1>
      <p className="muted">
        Katalog peraturan, katalog pasal, dan riwayat keberlakuan berdasarkan tanggal acuan.
      </p>

      <div className="card">
        <form onSubmit={runSearch} className="grid-2" style={{ gridTemplateColumns: '1fr 180px 180px 180px 150px auto auto' }}>
          <input
            className="input"
            placeholder="Cari isi pasal, judul peraturan, yurisprudensi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={type} onChange={(e) => { setType(e.target.value as RegulationType | ''); setPage(1); }}>
            <option value="">Semua jenis</option>
            {Object.entries(regulationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={status}
            onChange={(e) => { setStatus(e.target.value as LegalSourceStatus | ''); setPage(1); }}
          >
            <option value="">Semua status</option>
            {Object.entries(legalSourceStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={jurisdiction}
            onChange={(e) => { setJurisdiction(e.target.value as Jurisdiction | ''); setPage(1); }}
          >
            <option value="">Semua peradilan</option>
            <option value="CIVIL">Perdata</option>
            <option value="CRIMINAL">Pidana</option>
            <option value="ADMINISTRATIVE">TUN</option>
            <option value="RELIGIOUS">Agama</option>
            <option value="MILITARY">Militer</option>
            <option value="ARBITRATION">Arbitrase</option>
          </select>
          <div className="field">
            <label>Tanggal acuan</label>
            <input className="input" type="date" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ alignSelf: 'end' }}>
            Cari
          </button>
          <button className="btn btn-ghost" type="button" style={{ alignSelf: 'end' }} onClick={reset}>
            Reset
          </button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      {hits.length > 0 && (
        <div className="card">
          <h3>Hasil pencarian ({hits.length})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Judul</th>
                <th>Cuplikan</th>
                <th>Skor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((hit) => (
                <tr key={`${hit.kind}-${hit.id}`}>
                  <td>
                    <span className="badge">{hit.kind}</span>
                  </td>
                  <td>
                    {hit.kind === 'JURISPRUDENCE' ? (
                      hit.title
                    ) : (
                      <Link to={`/peraturan/${hit.regulation?.slug ?? ''}`}>{hit.title}</Link>
                    )}
                  </td>
                  <td>
                    <HighlightSnippet text={hit.snippet} />
                  </td>
                  <td>{hit.rank.toFixed(3)}</td>
                  <td>
                    {hit.applicability ? (
                      <span className={`badge badge-${hit.applicability.state}`}>
                        {hit.applicability.label}
                      </span>
                    ) : (
                      hit.status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3>Peraturan {loading ? '(memuat...)' : ''}</h3>
        {items.length === 0 ? (
          <p className="muted">
            Belum ada peraturan. Jalankan <code>npm run legal:ingest</code> dengan dataset kurasi.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Identitas</th>
                <th>Judul</th>
                <th>Jenis</th>
                <th>Peradilan</th>
                <th>Pasal</th>
                <th>Berlaku</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/peraturan/${r.slug}`}>
                      {[regulationTypeLabels[r.type], r.number, r.year].filter(Boolean).join(' ')}
                    </Link>
                  </td>
                  <td>{r.title}</td>
                  <td>{regulationTypeLabels[r.type]}</td>
                  <td>{r.jurisdiction ? jurisdictionLabels[r.jurisdiction] : '-'}</td>
                  <td>{r._count.articles}</td>
                  <td>
                    <span className={`badge badge-${r.applicability.state}`}>
                      {r.applicability.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </button>
          <span className="muted">
            Halaman {page} dari {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
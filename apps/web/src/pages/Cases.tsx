import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, jurisdictionLabels } from '../api';
import type { CaseStatus, CaseSummary, Jurisdiction } from '../types';

export default function Cases() {
  const [items, setItems] = useState<CaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | ''>('');
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', jurisdiction: 'CIVIL' as Jurisdiction, caseType: '', courtName: '', caseNumber: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    void api
      .listCases({
        page,
        limit: 10,
        search: search || undefined,
        status: status || undefined,
        jurisdiction: jurisdiction || undefined,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.meta.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat perkara'));
  };

  useEffect(load, [page, status, jurisdiction]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createCase(form);
      setForm({ title: '', jurisdiction: 'CIVIL', caseType: '', courtName: '', caseNumber: '' });
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat perkara');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div>
      <h1>Perkara</h1>

      <div className="card">
        <form onSubmit={onSearch} className="grid-2" style={{ gridTemplateColumns: '1fr 160px 160px auto auto' }}>
          <input
            className="input"
            placeholder="Cari nomor perkara, judul, pengadilan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | '')}>
            <option value="">Semua status</option>
            <option value="NEW">Baru</option>
            <option value="ACTIVE">Berjalan</option>
            <option value="POSTPONED">Ditunda</option>
            <option value="DECIDED">Putus</option>
            <option value="CLOSED">Selesai</option>
            <option value="ARCHIVED">Arsip</option>
          </select>
          <select
            className="select"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as Jurisdiction | '')}
          >
            <option value="">Semua peradilan</option>
            <option value="CIVIL">Perdata</option>
            <option value="CRIMINAL">Pidana</option>
            <option value="ADMINISTRATIVE">TUN</option>
            <option value="RELIGIOUS">Agama</option>
            <option value="MILITARY">Militer</option>
            <option value="ARBITRATION">Arbitrase</option>
          </select>
          <button className="btn" type="submit">
            Cari
          </button>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Tutup' : '+ Perkara Baru'}
          </button>
        </form>
      </div>

      {showForm && (
        <div className="card">
          <h3>Perkara Baru</h3>
          <form onSubmit={onCreate} className="grid-2">
            <div className="field">
              <label>Judul / Nama Perkara</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Nomor Perkara (opsional)</label>
              <input
                className="input"
                value={form.caseNumber}
                onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                placeholder="Otomatis bila dikosongkan"
              />
            </div>
            <div className="field">
              <label>Lingkungan Peradilan</label>
              <select
                className="select"
                value={form.jurisdiction}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value as Jurisdiction })}
              >
                <option value="CIVIL">Perdata</option>
                <option value="CRIMINAL">Pidana</option>
                <option value="ADMINISTRATIVE">TUN</option>
                <option value="RELIGIOUS">Agama</option>
                <option value="MILITARY">Militer</option>
                <option value="ARBITRATION">Arbitrase</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div className="field">
              <label>Jenis</label>
              <input
                className="input"
                value={form.caseType}
                onChange={(e) => setForm({ ...form, caseType: e.target.value })}
                placeholder="Mis. Gugatan Wanprestasi"
              />
            </div>
            <div className="field">
              <label>Pengadilan</label>
              <input
                className="input"
                value={form.courtName}
                onChange={(e) => setForm({ ...form, courtName: e.target.value })}
                placeholder="Mis. PN Jakarta Pusat"
              />
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">Tidak ada perkara.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>No. Perkara</th>
                <th>Judul</th>
                <th>Peradilan</th>
                <th>Pengadilan</th>
                <th>Advokat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/perkara/${c.id}`}>{c.caseNumber}</Link>
                  </td>
                  <td>{c.title}</td>
                  <td>{jurisdictionLabels[c.jurisdiction]}</td>
                  <td>{c.courtName ?? '-'}</td>
                  <td>{c.assignedTo?.fullName ?? '-'}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
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
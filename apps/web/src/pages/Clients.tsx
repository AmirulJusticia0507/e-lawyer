import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api';
import type { Client, ClientType } from '../types';

export default function Clients() {
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', type: 'PERSON' as ClientType, nik: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    void api
      .listClients({ page, limit: 10, search: search || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.meta.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat klien'));
  };

  useEffect(load, [page]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createClient(form);
      setForm({ fullName: '', type: 'PERSON', nik: '', phone: '', email: '' });
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan klien');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div>
      <h1>Data Klien</h1>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={onSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input
              className="input"
              placeholder="Cari nama, email, NIK, telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" type="submit">
              Cari
            </button>
          </form>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Tutup' : '+ Klien Baru'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>Klien Baru</h3>
          <form onSubmit={onCreate} className="grid-2">
            <div className="field">
              <label>Nama Lengkap</label>
              <input
                className="input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Tipe</label>
              <select
                className="select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}
              >
                <option value="PERSON">Perorangan</option>
                <option value="ORGANIZATION">Perusahaan / Organisasi</option>
              </select>
            </div>
            <div className="field">
              <label>NIK</label>
              <input
                className="input"
                value={form.nik}
                onChange={(e) => setForm({ ...form, nik: e.target.value })}
                maxLength={16}
              />
            </div>
            <div className="field">
              <label>Telepon</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          <p className="muted">Tidak ada klien.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tipe</th>
                <th>NIK</th>
                <th>Email</th>
                <th>Telepon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/klien/${c.id}`}>{c.fullName}</Link>
                  </td>
                  <td>{c.type === 'PERSON' ? 'Perorangan' : 'Perusahaan'}</td>
                  <td>{c.nik ?? '-'}</td>
                  <td>{c.email ?? '-'}</td>
                  <td>{c.phone ?? '-'}</td>
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
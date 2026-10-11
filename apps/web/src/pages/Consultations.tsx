import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  consultationModeLabels,
  consultationStatusLabels,
} from '../api';
import type { Client, ConsultationMode, ConsultationStatus, ConsultationSummary } from '../types';

export default function Consultations() {
  const [items, setItems] = useState<ConsultationSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConsultationStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    subject: '',
    description: '',
    mode: 'CHAT' as ConsultationMode,
    scheduledAt: '',
  });

  const load = () => {
    void api
      .listConsultations({ page, limit: 10, search: search || undefined, status: status || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.meta.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat konsultasi'));
  };

  useEffect(load, [page, status]);

  useEffect(() => {
    void api
      .listClients({ limit: 100 })
      .then((res) => setClients(res.items))
      .catch(() => undefined);
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createConsultation({
        clientId: form.clientId,
        subject: form.subject,
        description: form.description || undefined,
        mode: form.mode,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      setForm({ clientId: '', subject: '', description: '', mode: 'CHAT', scheduledAt: '' });
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat konsultasi');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div>
      <h1>Konsultasi Legal</h1>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={onSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input
              className="input"
              placeholder="Cari subjek, deskripsi, klien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as ConsultationStatus | '')}
              style={{ maxWidth: 180 }}
            >
              <option value="">Semua status</option>
              <option value="REQUESTED">Diajukan</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="ONGOING">Berlangsung</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
            <button className="btn" type="submit">
              Cari
            </button>
          </form>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Tutup' : '+ Konsultasi Baru'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>Pengajuan Konsultasi</h3>
          <form onSubmit={onCreate} className="grid-2">
            <div className="field">
              <label>Klien</label>
              <select
                className="select"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="">Pilih klien...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Mode</label>
              <select
                className="select"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as ConsultationMode })}
              >
                <option value="CHAT">Chat</option>
                <option value="VIDEO">Video Call</option>
                <option value="PHONE">Telepon</option>
                <option value="IN_PERSON">Tatap Muka</option>
              </select>
            </div>
            <div className="field">
              <label>Subjek</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                placeholder="Mis. Konsultasi wanprestasi kontrak"
              />
            </div>
            <div className="field">
              <label>Jadwal Preferensi (opsional)</label>
              <input
                className="input"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Deskripsi</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Ajukan'}
              </button>
            </div>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">Belum ada konsultasi.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subjek</th>
                <th>Klien</th>
                <th>Mode</th>
                <th>Jadwal</th>
                <th>Advokat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/konsultasi/${c.id}`}>{c.subject}</Link>
                  </td>
                  <td>{c.client.fullName}</td>
                  <td>{consultationModeLabels[c.mode]}</td>
                  <td>{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('id-ID') : '-'}</td>
                  <td>{c.assignedTo?.fullName ?? '-'}</td>
                  <td>
                    <span className="badge">{consultationStatusLabels[c.status]}</span>
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
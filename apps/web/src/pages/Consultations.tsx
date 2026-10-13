import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  consultationModeLabels,
  consultationStatusLabels,
} from '../api';
import { Button, Card, Badge, Input, Select, EmptyState, Modal, Textarea } from '../components/ui';
import type { Client, ConsultationMode, ConsultationStatus, ConsultationSummary } from '../types';

const MODE_OPTIONS: { value: ConsultationMode; label: string }[] = [
  { value: 'CHAT', label: 'Chat' },
  { value: 'VIDEO', label: 'Video Call' },
  { value: 'PHONE', label: 'Telepon' },
  { value: 'IN_PERSON', label: 'Tatap Muka' },
];

const STATUS_OPTIONS: { value: ConsultationStatus | ''; label: string }[] = [
  { value: '', label: 'Semua status' },
  { value: 'REQUESTED', label: 'Diajukan' },
  { value: 'SCHEDULED', label: 'Terjadwal' },
  { value: 'ONGOING', label: 'Berlangsung' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const PAGE_SIZE = 10;

export default function Consultations() {
  const [items, setItems] = useState<ConsultationSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConsultationStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    subject: '',
    description: '',
    mode: 'CHAT' as ConsultationMode,
    scheduledAt: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listConsultations({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
      });
      setItems(res.items);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat konsultasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, status]);

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
      setShowModal(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat konsultasi');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Konsultasi Legal</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Kelola daftar konsultasi klien</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Konsultasi Baru</Button>
      </div>

      <Card>
        <form onSubmit={onSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium mb-1">Cari</label>
            <Input
              placeholder="Subjek, deskripsi, klien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConsultationStatus | '')}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              Cari
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setStatus(''); setPage(1); load(); }}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[var(--accent)] border-t-transparent" />
            <span className="sr-only">Memuat...</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada konsultasi" description={search || status ? 'Coba ubah filter pencarian' : 'Klik "Konsultasi Baru" untuk menambahkan.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">Subjek</th>
                    <th className="px-4 py-3">Klien</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Jadwal</th>
                    <th className="px-4 py-3">Advokat</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-4 font-medium">
                        <Link to={`/konsultasi/${c.id}`} className="text-[var(--accent)] hover:underline">
                          {c.subject}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{c.client.fullName}</td>
                      <td className="px-4 py-4">
                        <Badge tone="info">{consultationModeLabels[c.mode]}</Badge>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">
                        {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.assignedTo?.fullName ?? '-'}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getStatusTone(c.status)}>{consultationStatusLabels[c.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted)]">
                Menampilkan {startItem}–{endItem} dari {total} konsultasi
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-[var(--muted)]">
                  Halaman {page} dari {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konsultasi Baru"
        size="lg"
      >
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Klien <span className="text-rose-500">*</span></label>
            <Select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              options={[{ value: '', label: 'Pilih klien...' }, ...clients.map((c) => ({ value: c.id, label: c.fullName }))]}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mode <span className="text-rose-500">*</span></label>
            <Select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as ConsultationMode })}
              options={MODE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subjek <span className="text-rose-500">*</span></label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
              placeholder="Mis. Konsultasi wanprestasi kontrak"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jadwal Preferensi</label>
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Ajukan'}</Button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
      </Modal>
    </div>
  );
}

function getStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'ONGOING':
      return 'success';
    case 'SCHEDULED':
      return 'info';
    case 'COMPLETED':
      return 'neutral';
    case 'CANCELLED':
      return 'danger';
    case 'REQUESTED':
      return 'warning';
    default:
      return 'neutral';
  }
}
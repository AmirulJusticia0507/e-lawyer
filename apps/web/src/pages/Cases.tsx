import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, jurisdictionLabels } from '../api';
import { Button, Card, Badge, Input, Select, EmptyState, Modal } from '../components/ui';
import type { CaseStatus, CaseSummary, Jurisdiction } from '../types';

const STATUS_OPTIONS: { value: CaseStatus | ''; label: string }[] = [
  { value: '', label: 'Semua status' },
  { value: 'NEW', label: 'Baru' },
  { value: 'ACTIVE', label: 'Berjalan' },
  { value: 'POSTPONED', label: 'Ditunda' },
  { value: 'DECIDED', label: 'Putus' },
  { value: 'CLOSED', label: 'Selesai' },
  { value: 'ARCHIVED', label: 'Arsip' },
];

const JURISDICTION_OPTIONS: { value: Jurisdiction | ''; label: string }[] = [
  { value: '', label: 'Semua peradilan' },
  { value: 'CIVIL', label: 'Perdata' },
  { value: 'CRIMINAL', label: 'Pidana' },
  { value: 'ADMINISTRATIVE', label: 'TUN' },
  { value: 'RELIGIOUS', label: 'Agama' },
  { value: 'MILITARY', label: 'Militer' },
  { value: 'ARBITRATION', label: 'Arbitrase' },
  { value: 'OTHER', label: 'Lainnya' },
];

const JURISDICTION_FORM_OPTIONS: { value: Jurisdiction; label: string }[] = [
  { value: 'CIVIL', label: 'Perdata' },
  { value: 'CRIMINAL', label: 'Pidana' },
  { value: 'ADMINISTRATIVE', label: 'TUN' },
  { value: 'RELIGIOUS', label: 'Agama' },
  { value: 'MILITARY', label: 'Militer' },
  { value: 'ARBITRATION', label: 'Arbitrase' },
  { value: 'OTHER', label: 'Lainnya' },
];

const PAGE_SIZE = 10;

export default function Cases() {
  const [items, setItems] = useState<CaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    jurisdiction: 'CIVIL' as Jurisdiction,
    caseType: '',
    courtName: '',
    caseNumber: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listCases({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        jurisdiction: jurisdiction || undefined,
      });
      setItems(res.items);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat perkara');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, status, jurisdiction]);

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
      await api.createCase(form);
      setForm({ title: '', jurisdiction: 'CIVIL', caseType: '', courtName: '', caseNumber: '' });
      setShowModal(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat perkara');
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Perkara</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Kelola daftar perkara firma</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Perkara Baru</Button>
      </div>

      <Card>
        <form onSubmit={onSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium mb-1">Cari</label>
            <Input
              placeholder="Nomor perkara, judul, pengadilan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus | '')}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium mb-1">Peradilan</label>
            <Select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as Jurisdiction | '')}
              options={JURISDICTION_OPTIONS}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              Cari
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setStatus(''); setJurisdiction(''); setPage(1); load(); }}>
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
          <EmptyState title="Tidak ada perkara" description={search || status || jurisdiction ? 'Coba ubah filter pencarian' : 'Belum ada perkara. Klik "Perkara Baru" untuk menambahkan.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">No. Perkara</th>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Peradilan</th>
                    <th className="px-4 py-3">Pengadilan</th>
                    <th className="px-4 py-3">Advokat</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-4 font-medium">
                        <Link to={`/perkara/${c.id}`} className="text-[var(--accent)] hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{c.title}</td>
                      <td className="px-4 py-4">
                        <Badge tone="info">{jurisdictionLabels[c.jurisdiction]}</Badge>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.courtName ?? '-'}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.assignedTo?.fullName ?? '-'}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getStatusTone(c.status)}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted)]">
                Menampilkan {startItem}–{endItem} dari {total} perkara
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
        title="Perkara Baru"
        size="lg"
      >
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Judul / Nama Perkara <span className="text-rose-500">*</span></label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Mis. Gugatan Wanprestasi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nomor Perkara</label>
            <Input
              value={form.caseNumber}
              onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
              placeholder="Otomatis bila dikosongkan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lingkungan Peradilan <span className="text-rose-500">*</span></label>
            <Select
              value={form.jurisdiction}
              onChange={(e) => setForm({ ...form, jurisdiction: e.target.value as Jurisdiction })}
              options={JURISDICTION_FORM_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jenis</label>
            <Input
              value={form.caseType}
              onChange={(e) => setForm({ ...form, caseType: e.target.value })}
              placeholder="Mis. Gugatan Wanprestasi"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Pengadilan</label>
            <Input
              value={form.courtName}
              onChange={(e) => setForm({ ...form, courtName: e.target.value })}
              placeholder="Mis. PN Jakarta Pusat"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
      </Modal>
    </div>
  );
}

function getStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'NEW':
    case 'POSTPONED':
      return 'warning';
    case 'DECIDED':
    case 'CLOSED':
      return 'info';
    case 'ARCHIVED':
      return 'neutral';
    default:
      return 'neutral';
  }
}
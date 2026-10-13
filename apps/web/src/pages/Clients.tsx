import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api';
import { Button, Card, Badge, Input, Select, EmptyState, Modal } from '../components/ui';
import type { Client, ClientType } from '../types';

const TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'PERSON', label: 'Perorangan' },
  { value: 'ORGANIZATION', label: 'Perusahaan / Organisasi' },
];

const PAGE_SIZE = 10;

export default function Clients() {
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    type: 'PERSON' as ClientType,
    nik: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listClients({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
      });
      setItems(res.items);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat klien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

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
      await api.createClient(form);
      setForm({ fullName: '', type: 'PERSON', nik: '', phone: '', email: '' });
      setShowModal(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan klien');
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Data Klien</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Kelola daftar klien firma</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Klien Baru</Button>
      </div>

      <Card>
        <form onSubmit={onSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium mb-1">Cari</label>
            <Input
              placeholder="Nama, email, NIK, telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              Cari
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); setPage(1); load(); }}>
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
          <EmptyState title="Tidak ada klien" description={search ? 'Coba ubah kata kunci pencarian' : 'Belum ada klien. Klik "Klien Baru" untuk menambahkan.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3">NIK</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Telepon</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-4 font-medium">
                        <Link to={`/klien/${c.id}`} className="text-[var(--accent)] hover:underline">
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={c.type === 'PERSON' ? 'info' : 'success'}>
                          {c.type === 'PERSON' ? 'Perorangan' : 'Perusahaan'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.nik ?? '-'}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.email ?? '-'}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{c.phone ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted)]">
                Menampilkan {startItem}–{endItem} dari {total} klien
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
        title="Klien Baru"
        size="lg"
      >
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Nama Lengkap <span className="text-rose-500">*</span></label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              placeholder="Nama lengkap klien"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipe <span className="text-rose-500">*</span></label>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}
              options={TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">NIK</label>
            <Input
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
              placeholder="Nomor Induk Kependudukan"
              maxLength={16}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telepon</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xx-xxxx-xxxx"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@domain.com"
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
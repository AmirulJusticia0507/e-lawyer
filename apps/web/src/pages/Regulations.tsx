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
import { Button, Card, Badge, Input, Select, EmptyState } from '../components/ui';
import type {
  Jurisdiction,
  LegalSourceStatus,
  RegulationListItem,
  RegulationType,
  SearchHit,
} from '../types';

const today = () => new Date().toISOString().slice(0, 10);

const REGULATION_TYPE_OPTIONS: { value: RegulationType | ''; label: string }[] = [
  { value: '', label: 'Semua jenis' },
  ...Object.entries(regulationTypeLabels).map(([value, label]) => ({ value: value as RegulationType, label })),
];

const STATUS_OPTIONS: { value: LegalSourceStatus | ''; label: string }[] = [
  { value: '', label: 'Semua status' },
  ...Object.entries(legalSourceStatusLabels).map(([value, label]) => ({ value: value as LegalSourceStatus, label })),
];

const JURISDICTION_OPTIONS: { value: Jurisdiction | ''; label: string }[] = [
  { value: '', label: 'Semua peradilan' },
  { value: 'CIVIL', label: 'Perdata' },
  { value: 'CRIMINAL', label: 'Pidana' },
  { value: 'ADMINISTRATIVE', label: 'TUN' },
  { value: 'RELIGIOUS', label: 'Agama' },
  { value: 'MILITARY', label: 'Militer' },
  { value: 'ARBITRATION', label: 'Arbitrase' },
];

const PAGE_SIZE = 10;

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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listRegulations({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        jurisdiction: jurisdiction || undefined,
        at: at || undefined,
      });
      setItems(res.items);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat peraturan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, type, status, jurisdiction, at]);

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Peraturan & Dasar Hukum</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Katalog peraturan, katalog pasal, dan riwayat keberlakuan berdasarkan tanggal acuan.
        </p>
      </div>

      <Card>
        <form onSubmit={runSearch} className="flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_160px_160px_160px_160px_auto_auto] sm:items-end">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Cari</label>
            <Input
              placeholder="Cari isi pasal, judul peraturan, yurisprudensi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-full">
            <label className="block text-sm font-medium mb-1">Jenis</label>
            <Select
              value={type}
              onChange={(e) => { setType(e.target.value as RegulationType | ''); setPage(1); }}
              options={REGULATION_TYPE_OPTIONS}
            />
          </div>
          <div className="sm:w-full">
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value as LegalSourceStatus | ''); setPage(1); }}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="sm:w-full">
            <label className="block text-sm font-medium mb-1">Peradilan</label>
            <Select
              value={jurisdiction}
              onChange={(e) => { setJurisdiction(e.target.value as Jurisdiction | ''); setPage(1); }}
              options={JURISDICTION_OPTIONS}
            />
          </div>
          <div className="sm:w-full">
            <label className="block text-sm font-medium mb-1">Tanggal acuan</label>
            <Input type="date" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              Cari
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {hits.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Hasil Pencarian ({hits.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Cuplikan</th>
                  <th className="px-4 py-3">Skor</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((hit) => (
                  <tr key={`${hit.kind}-${hit.id}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-4 py-4">
                      <Badge tone="info">{hit.kind}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      {hit.kind === 'JURISPRUDENCE' ? (
                        hit.title
                      ) : (
                        <Link to={`/peraturan/${hit.regulation?.slug ?? ''}`} className="text-[var(--accent)] hover:underline">
                          {hit.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--muted)]">
                      <HighlightSnippet text={hit.snippet} />
                    </td>
                    <td className="px-4 py-4 text-[var(--muted)]">{hit.rank.toFixed(3)}</td>
                    <td className="px-4 py-4">
                      {hit.applicability ? (
                        <Badge tone={getApplicabilityTone(hit.applicability.state)}>
                          {hit.applicability.label}
                        </Badge>
                      ) : (
                        hit.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-bold">Peraturan {loading ? '(memuat...)' : ''}</h2>
          <div className="text-sm text-[var(--muted)]">
            Menampilkan {startItem}–{endItem} dari {total} peraturan
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[var(--accent)] border-t-transparent" />
            <span className="sr-only">Memuat...</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Tidak ada peraturan"
            description="Jalankan <code>npm run legal:ingest</code> dengan dataset kurasi untuk mengisi katalog."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">Identitas</th>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Peradilan</th>
                    <th className="px-4 py-3">Pasal</th>
                    <th className="px-4 py-3">Berlaku</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-4 font-medium">
                        <Link to={`/peraturan/${r.slug}`} className="text-[var(--accent)] hover:underline">
                          {[regulationTypeLabels[r.type], r.number, r.year].filter(Boolean).join(' ')}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{r.title}</td>
                      <td className="px-4 py-4">
                        <Badge tone="info">{regulationTypeLabels[r.type]}</Badge>
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">{r.jurisdiction ? jurisdictionLabels[r.jurisdiction] : '-'}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{r._count.articles}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getApplicabilityTone(r.applicability.state)}>
                          {r.applicability.label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          </>
        )}
      </Card>
    </div>
  );
}

function getApplicabilityTone(state: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (state) {
    case 'APPLICABLE':
      return 'success';
    case 'NOT_YET_EFFECTIVE':
    case 'DRAFT':
      return 'info';
    case 'EXPIRED':
    case 'REPEALED':
      return 'danger';
    default:
      return 'neutral';
  }
}
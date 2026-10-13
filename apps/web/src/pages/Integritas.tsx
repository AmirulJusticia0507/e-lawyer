import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  anomalySeverityLabels,
  anomalyStatusLabels,
  anomalyTypeLabels,
} from '../api';
import { Button, Card, Badge, Select, EmptyState } from '../components/ui';
import type { AnomalyFlag, AnomalyStatus, Paginated } from '../types';

const STATUSES: (AnomalyStatus | '')[] = ['', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];

const SEVERITY_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  OPEN: 'info',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

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

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Integritas & Anti-Manipulasi</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Monitoring anomali integritas lintas perkara: upload mendadak, tanggal mundur
          mencurigakan, perubahan klaim, pola penundaan, hash berubah, dan tenggat terlampaui.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-600" role="alert">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as AnomalyStatus | '')}
              options={STATUSES.map((s) => ({ value: s, label: s ? anomalyStatusLabels[s] : 'Semua' }))}
            />
          </Field>
          <Button type="submit" disabled={busy}>Filter</Button>
        </form>
      </Card>

      {!data || data.items.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada flag anomali" description="Sistem tidak mendeteksi anomali integritas pada filter saat ini." />
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Perkara</th>
                    <th className="px-4 py-3">Pesan</th>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-4">{anomalyTypeLabels[a.type]}</td>
                      <td className="px-4 py-4">
                        <Badge tone={SEVERITY_TONES[a.severity] || 'neutral'}>{anomalySeverityLabels[a.severity]}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={STATUS_TONES[a.status] || 'neutral'}>
                          {anomalyStatusLabels[a.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {a.case ? (
                          <Link to={`/perkara/${a.case.id}`} className="text-[var(--accent)] hover:underline">
                            {a.case.caseNumber}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <div>{a.message}</div>
                        {a.resolutionNote && (
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            Catatan: {a.resolutionNote}
                            {a.resolvedBy ? ` - ${a.resolvedBy.fullName}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[var(--muted)]">
                        {new Date(a.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {a.status === 'OPEN' && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => update(a.id, 'ACKNOWLEDGED')}
                          >
                            Akui
                          </Button>
                        )}
                        {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => update(a.id, 'RESOLVED')}
                            >
                              Selesai
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => update(a.id, 'DISMISSED')}
                            >
                              Abaikan
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  Halaman {data.meta.page} / {data.meta.totalPages} — total {data.meta.total} flag
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
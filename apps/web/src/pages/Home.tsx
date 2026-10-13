import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, jurisdictionLabels } from '../api';
import { Card, Badge } from '../components/ui';
import type { CaseSummary, Client } from '../types';

export default function Home() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [activeCases, setActiveCases] = useState(0);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    void Promise.all([
      api.listCases({ limit: 5 }),
      api.listCases({ limit: 1, status: 'ACTIVE' }),
      api.listClients({ limit: 5 }),
    ])
      .then(([recent, active, cl]) => {
        setCases(recent.items);
        setTotalCases(recent.meta.total);
        setActiveCases(active.meta.total);
        setClients(cl.items);
        setTotalClients(cl.meta.total);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Ringkasan perkara dan klien firma Anda</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total Perkara" value={totalCases} />
        <MetricCard label="Perkara Aktif" value={activeCases} />
        <MetricCard label="Total Klien" value={totalClients} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Perkara</p>
            <h2 className="mt-1 text-xl font-bold">Perkara Terbaru</h2>
          </div>
          <Link to="/perkara" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Lihat semua →
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada perkara.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-3">No. Perkara</th>
                  <th className="px-3 py-3">Judul</th>
                  <th className="px-3 py-3">Peradilan</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-3 py-4 font-medium">
                      <Link to={`/perkara/${c.id}`} className="text-[var(--accent)] hover:underline">
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-4">{c.title}</td>
                    <td className="px-3 py-4 text-[var(--muted)]">{jurisdictionLabels[c.jurisdiction]}</td>
                    <td className="px-3 py-4">
                      <Badge tone={getBadgeTone(c.status)}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Klien</p>
            <h2 className="mt-1 text-xl font-bold">Klien Terbaru</h2>
          </div>
          <Link to="/klien" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Lihat semua →
          </Link>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada klien.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-3">Nama</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Telepon</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-3 py-4 font-medium">
                      <Link to={`/klien/${c.id}`} className="text-[var(--accent)] hover:underline">
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-[var(--muted)]">{c.email ?? '-'}</td>
                    <td className="px-3 py-4 text-[var(--muted)]">{c.phone ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)]">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-bold text-[var(--text)]">{value}</div>
    </Card>
  );
}

function getBadgeTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'CLOSED':
      return 'neutral';
    case 'ARCHIVED':
      return 'info';
    default:
      return 'neutral';
  }
}
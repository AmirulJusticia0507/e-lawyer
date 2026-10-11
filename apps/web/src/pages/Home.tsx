import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, jurisdictionLabels } from '../api';
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
    <div>
      <h1>Dashboard</h1>

      <div className="card">
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
          <div>
            <div className="muted">Total Perkara</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalCases}</div>
          </div>
          <div>
            <div className="muted">Perkara Aktif</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{activeCases}</div>
          </div>
          <div>
            <div className="muted">Total Klien</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalClients}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Perkara Terbaru</h2>
        {cases.length === 0 ? (
          <p className="muted">Belum ada perkara.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>No. Perkara</th>
                <th>Judul</th>
                <th>Peradilan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/perkara/${c.id}`}>{c.caseNumber}</Link>
                  </td>
                  <td>{c.title}</td>
                  <td>{jurisdictionLabels[c.jurisdiction]}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p>
          <Link to="/perkara">Lihat semua perkara →</Link>
        </p>
      </div>

      <div className="card">
        <h2>Klien Terbaru</h2>
        {clients.length === 0 ? (
          <p className="muted">Belum ada klien.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Telepon</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/klien/${c.id}`}>{c.fullName}</Link>
                  </td>
                  <td>{c.email ?? '-'}</td>
                  <td>{c.phone ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p>
          <Link to="/klien">Lihat semua klien →</Link>
        </p>
      </div>
    </div>
  );
}
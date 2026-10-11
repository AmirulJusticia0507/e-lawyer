import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, interactionLabels, sideLabels } from '../api';
import type { Client, Interaction, Party } from '../types';

type ClientDetailData = Client & { parties: Party[]; interactions: Interaction[] };

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClientDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getClient(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat detail klien'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Memuat...</p>;

  return (
    <div>
      <p>
        <Link to="/klien">← Kembali ke daftar klien</Link>
      </p>
      <h1>{data.fullName}</h1>
      <span className="badge">{data.type === 'PERSON' ? 'Perorangan' : 'Perusahaan'}</span>

      <div className="card">
        <h3>Kontak & Identitas</h3>
        <div className="grid-2">
          <div className="field">
            <label>NIK</label>
            <div>{data.nik ?? '-'}</div>
          </div>
          <div className="field">
            <label>NPWP</label>
            <div>{data.npwp ?? '-'}</div>
          </div>
          <div className="field">
            <label>Email</label>
            <div>{data.email ?? '-'}</div>
          </div>
          <div className="field">
            <label>Telepon</label>
            <div>{data.phone ?? '-'}</div>
          </div>
        </div>
        {data.notes && (
          <p style={{ marginTop: '1rem' }}>
            <strong>Catatan:</strong> {data.notes}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Terlibat dalam Perkara</h3>
        {data.parties.length === 0 ? (
          <p className="muted">Belum terdaftar dalam perkara mana pun.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kedudukan</th>
                <th>Perkara</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{sideLabels[p.side]}</td>
                  <td>
                    {p.case ? (
                      <Link to={`/perkara/${p.case.id}`}>
                        {p.case.caseNumber} — {p.case.title}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Riwayat Interaksi</h3>
        {data.interactions.length === 0 ? (
          <p className="muted">Belum ada interaksi.</p>
        ) : (
          <div className="timeline">
            {data.interactions.map((it) => (
              <div key={it.id} className="timeline-item">
                <span className="badge">{interactionLabels[it.type]}</span>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>{it.title}</strong>
                </div>
                {it.description && <p className="muted" style={{ margin: '0.25rem 0' }}>{it.description}</p>}
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {new Date(it.occurredAt).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
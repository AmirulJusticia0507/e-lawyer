import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, interactionLabels, jurisdictionLabels, sideLabels, statusFlow } from '../api';
import type { CaseDetail, CaseStatus, InteractionType, PartySide } from '../types';

const emptyForm = { side: 'PLAINTIFF' as PartySide, name: '', clientId: '' };
const emptyInteraction = { type: 'CALL' as InteractionType, title: '', description: '' };

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [partyForm, setPartyForm] = useState(emptyForm);
  const [interactionForm, setInteractionForm] = useState(emptyInteraction);
  const [assignTo, setAssignTo] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const load = () => {
    if (!id) return;
    api
      .getCase(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat perkara'));
  };

  useEffect(load, [id]);

  const transition = async (to: CaseStatus) => {
    if (!id) return;
    await api.changeStatus(id, to);
    load();
  };

  const assign = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !assignTo) return;
    await api.assignCase(id, assignTo, assignNote || undefined);
    setAssignTo('');
    setAssignNote('');
    load();
  };

  const addParty = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !partyForm.name) return;
    await api.addParty(id, {
      side: partyForm.side,
      name: partyForm.name,
      clientId: partyForm.clientId || undefined,
    });
    setPartyForm(emptyForm);
    load();
  };

  const addInteraction = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !interactionForm.title) return;
    await api.addInteraction(id, interactionForm);
    setInteractionForm(emptyInteraction);
    load();
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Memuat...</p>;

  const nextStatuses = statusFlow[data.status] ?? [];

  return (
    <div>
      <p>
        <Link to="/perkara">← Kembali ke daftar perkara</Link>
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <h1 style={{ margin: '0.5rem 0' }}>{data.title}</h1>
        <span className={`badge badge-${data.status}`}>{data.status}</span>
      </div>
      <p className="muted">
        No. {data.caseNumber} · {jurisdictionLabels[data.jurisdiction]}
        {data.courtName ? ` · ${data.courtName}` : ''}
      </p>

      <div className="card">
        <h3>Ringkasan</h3>
        <div className="grid-2">
          <div className="field">
            <label>Advokat Penanggung Jawab</label>
            <div>{data.assignedTo?.fullName ?? '-'}</div>
          </div>
          <div className="field">
            <label>Diajukan oleh</label>
            <div>{data.filedBy?.fullName ?? '-'}</div>
          </div>
          {data.description && <p style={{ gridColumn: '1 / -1' }}>{data.description}</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {nextStatuses.map((s) => (
            <button key={s} className="btn btn-sm" onClick={() => void transition(s)}>
              Ubah ke {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Transfer / Assign Advokat</h3>
        <form onSubmit={assign} className="grid-2">
          <div className="field">
            <label>User ID Advokat Tujuan</label>
            <input className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} required placeholder="UUID user" />
          </div>
          <div className="field">
            <label>Catatan</label>
            <input className="input" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
          </div>
          <div>
            <button className="btn" type="submit">
              Assign
            </button>
          </div>
        </form>
        {data.assignments.length > 0 && (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Dari</th>
                <th>Ke</th>
                <th>Oleh</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.fromUser?.fullName ?? '-'}</td>
                  <td>{a.toUser.fullName}</td>
                  <td>{a.assignedBy?.fullName ?? '-'}</td>
                  <td>{new Date(a.createdAt).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Para Pihak</h3>
        {data.parties.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kedudukan</th>
                <th>Terhubung Klien</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{sideLabels[p.side]}</td>
                  <td>
                    {p.client ? <Link to={`/klien/${p.client.id}`}>{p.client.fullName}</Link> : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form onSubmit={addParty} className="grid-2" style={{ marginTop: '1rem' }}>
          <div className="field">
            <label>Nama Pihak</label>
            <input
              className="input"
              value={partyForm.name}
              onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
              required
              placeholder="Mis. PT Sukses Jaya"
            />
          </div>
          <div className="field">
            <label>Kedudukan</label>
            <select
              className="select"
              value={partyForm.side}
              onChange={(e) => setPartyForm({ ...partyForm, side: e.target.value as PartySide })}
            >
              <option value="PLAINTIFF">Penggugat</option>
              <option value="DEFENDANT">Tergugat</option>
              <option value="APPLICANT">Pemohon</option>
              <option value="RESPONDENT">Termohon</option>
              <option value="ACCUSED">Terdakwa</option>
              <option value="THIRD_PARTY">Pihak Ketiga</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
          <div className="field">
            <label>User ID Klien (opsional)</label>
            <input
              className="input"
              value={partyForm.clientId}
              onChange={(e) => setPartyForm({ ...partyForm, clientId: e.target.value })}
              placeholder="UUID klien"
            />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit">
              Tambah Pihak
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Timeline Interaksi</h3>
        {data.interactions.length > 0 && (
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
                  {it.createdBy ? ` · ${it.createdBy.fullName}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={addInteraction} className="grid-2" style={{ marginTop: '1rem' }}>
          <div className="field">
            <label>Jenis Interaksi</label>
            <select
              className="select"
              value={interactionForm.type}
              onChange={(e) =>
                setInteractionForm({ ...interactionForm, type: e.target.value as InteractionType })
              }
            >
              <option value="CALL">Telepon</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Pertemuan</option>
              <option value="HEARING">Sidang</option>
              <option value="DOCUMENT">Dokumen</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
          <div className="field">
            <label>Judul</label>
            <input
              className="input"
              value={interactionForm.title}
              onChange={(e) => setInteractionForm({ ...interactionForm, title: e.target.value })}
              required
              placeholder="Mis. Rapat persiapan sidang pertama"
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Deskripsi</label>
            <textarea
              className="input"
              rows={3}
              value={interactionForm.description}
              onChange={(e) =>
                setInteractionForm({ ...interactionForm, description: e.target.value })
              }
            />
          </div>
          <div>
            <button className="btn" type="submit">
              Catat Interaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
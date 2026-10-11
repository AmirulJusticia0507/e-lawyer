import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  api,
  consultationModeLabels,
  consultationStatusFlow,
  consultationStatusLabels,
} from '../api';
import { useAuth } from '../auth/AuthContext';
import { useConsultationSocket } from '../realtime';
import type { ConsultationDetail as Detail, ConsultationStatus, VideoSession } from '../types';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [assignTo, setAssignTo] = useState('');
  const [assignAt, setAssignAt] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!id) return;
    api
      .getConsultation(id)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat konsultasi'));
  };

  useEffect(load, [id]);

  useConsultationSocket(id, {
    onMessage: (m) =>
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, m] } : prev)),
    onStatus: (c) => setData(c),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !message.trim()) return;
    setSending(true);
    try {
      const created = await api.sendMessage(id, { body: message.trim() });
      setMessage('');
      setData((prev) =>
        prev && !prev.messages.some((m) => m.id === created.id)
          ? { ...prev, messages: [...prev.messages, created] }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!id) return;
    try {
      const created = await api.sendMessage(id, { body: `📎 ${file.name}`, type: 'FILE' });
      await api.uploadAttachment(id, file, created.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengunggah berkas');
    }
  };

  const changeStatus = async (status: ConsultationStatus) => {
    if (!id) return;
    try {
      const updated = await api.changeConsultationStatus(id, status);
      setData(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah status');
    }
  };

  const assign = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !assignTo) return;
    try {
      const updated = await api.assignConsultation(id, {
        toUserId: assignTo,
        scheduledAt: assignAt ? new Date(assignAt).toISOString() : undefined,
      });
      setData(updated);
      setAssignTo('');
      setAssignAt('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menugaskan advokat');
    }
  };

  const createVideo = async () => {
    if (!id) return;
    try {
      const session = await api.createVideoSession(id);
      setData((prev) => (prev ? { ...prev, videoSessions: [session, ...prev.videoSessions] } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat sesi video');
    }
  };

  const setVideoStatus = async (session: VideoSession, status: VideoSession['status']) => {
    if (!id) return;
    try {
      const updated = await api.updateVideoSessionStatus(id, session.id, status);
      setData((prev) =>
        prev
          ? { ...prev, videoSessions: prev.videoSessions.map((v) => (v.id === updated.id ? updated : v)) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memperbarui sesi video');
    }
  };

  const download = async (attachmentId: string, fileName: string) => {
    if (!id) return;
    try {
      const blob = await api.downloadAttachment(id, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Gagal mengunduh berkas');
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Memuat...</p>;

  const nextStatuses = consultationStatusFlow[data.status] ?? [];
  const attachments = data.messages.flatMap((m) => m.attachments);

  return (
    <div>
      <p>
        <Link to="/konsultasi">← Kembali ke daftar konsultasi</Link>
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: '0.5rem 0' }}>{data.subject}</h1>
        <span className="badge">{consultationStatusLabels[data.status]}</span>
        <span className="badge">{consultationModeLabels[data.mode]}</span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="grid-2">
          <div className="field">
            <label>Klien</label>
            <div>
              <Link to={`/klien/${data.client.id}`}>{data.client.fullName}</Link>
            </div>
          </div>
          <div className="field">
            <label>Advokat</label>
            <div>{data.assignedTo?.fullName ?? 'Belum ditugaskan'}</div>
          </div>
          <div className="field">
            <label>Jadwal</label>
            <div>{data.scheduledAt ? new Date(data.scheduledAt).toLocaleString('id-ID') : '-'}</div>
          </div>
          <div className="field">
            <label>Perkara Terkait</label>
            <div>
              {data.case ? (
                <Link to={`/perkara/${data.case.id}`}>
                  {data.case.caseNumber} — {data.case.title}
                </Link>
              ) : (
                '-'
              )}
            </div>
          </div>
        </div>
        {data.description && <p style={{ marginTop: '1rem' }}>{data.description}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {nextStatuses.map((s) => (
            <button key={s} className="btn btn-sm" onClick={() => void changeStatus(s)}>
              Ubah ke {consultationStatusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Penugasan Advokat</h3>
        <form onSubmit={assign} className="grid-2">
          <div className="field">
            <label>User ID Advokat</label>
            <input className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} required placeholder="UUID user" />
          </div>
          <div className="field">
            <label>Jadwal</label>
            <input className="input" type="datetime-local" value={assignAt} onChange={(e) => setAssignAt(e.target.value)} />
          </div>
          <div>
            <button className="btn" type="submit">
              Tugaskan
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Ruang Konsultasi</h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: 380,
            overflowY: 'auto',
            padding: '0.5rem',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 8,
          }}
        >
          {data.messages.length === 0 && <p className="muted">Belum ada pesan.</p>}
          {data.messages.map((m) => {
            const mine = m.sender?.id === user?.id;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: mine ? '#2563eb' : '#f1f5f9',
                  color: mine ? '#fff' : '#0f172a',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                  {m.sender?.fullName ?? 'Sistem'} · {new Date(m.createdAt).toLocaleString('id-ID')}
                </div>
                <div>{m.body ?? '(terenkripsi)'}</div>
                {m.attachments.map((a) => (
                  <div key={a.id}>
                    <button className="btn btn-ghost btn-sm" onClick={() => void download(a.id, a.fileName)}>
                      Unduh {a.fileName} ({(a.sizeBytes / 1024).toFixed(0)} KB)
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input
            className="input"
            placeholder="Tulis pesan..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="btn" type="submit" disabled={sending}>
            Kirim
          </button>
          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = '';
            }}
          />
          <button className="btn btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
            Lampirkan
          </button>
        </form>

        {attachments.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <strong className="muted">Berkas ({attachments.length})</strong>
            <ul className="muted" style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
              {attachments.map((a) => (
                <li key={a.id}>{a.fileName}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Sesi Video</h3>
        {data.videoSessions.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Mulai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.videoSessions.map((v) => (
                <tr key={v.id}>
                  <td>{v.roomId}</td>
                  <td>{v.provider}</td>
                  <td>{v.status}</td>
                  <td>{v.startedAt ? new Date(v.startedAt).toLocaleString('id-ID') : '-'}</td>
                  <td style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn btn-sm" onClick={() => void setVideoStatus(v, 'ACTIVE')}>
                      Aktifkan
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => void setVideoStatus(v, 'ENDED')}>
                      Akhiri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn" style={{ marginTop: '0.75rem' }} onClick={() => void createVideo()}>
          Buat Sesi Video
        </button>
      </div>
    </div>
  );
}
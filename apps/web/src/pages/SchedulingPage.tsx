import React, { useState, useEffect } from 'react';
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Button, Input, Select, Textarea } from '@/components/ui';
import { Calendar, onEventDrop, onEventResize } from '@/components/Calendar';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';

export function SchedulingPage() {
  const [hearings, setHearings] = React.useState([]);
  const [newHearing, setNewHearing] = React.useState({
    caseId: '',
    startsAt: '',
    endsAt: '',
    courtroom: '',
    judgeName: '',
    status: 'SCHEDULED',
  });
  const [conflicts, setConflicts] = React.useState([]);
  const [postponementForm, setPostponementForm] = useState({
    hearingId: '',
    reason: '',
    newStartsAt: '',
    newEndsAt: '',
  });
  const [postponementErrors, setPostponementErrors] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hearings')
      .then((res) => res.json())
      .then((data) => {
        setHearings(data);
        checkConflicts();
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/hearings')
        .then((res) => res.json())
        .then((data) => {
          setHearings(data);
          checkConflicts();
        });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConflicts = () => {
    const conflicts = [];
    for (let i = 0; i < hearings.length; i++) {
      for (let j = i + 1; j < hearings.length; j++) {
        const a = hearings[i];
        const b = hearings[j];
        if (a.courtroom === b.courtroom) {
          const startA = new Date(a.startsAt).getTime();
          const endA = new Date(a.endsAt).getTime();
          const startB = new Date(b.startsAt).getTime();
          const endB = new Date(b.endsAt).getTime();
          if (startA < endB && startB < endA) {
            conflicts.push({ hearingA: a, hearingB: b });
          }
        }
      }
    }
    setConflicts(conflicts);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/hearings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newHearing),
    });
    const data = await response.json();
    setHearings((prev) => [...prev, data]);
    setNewHearing({
      caseId: '',
      startsAt: '',
      endsAt: '',
      courtroom: '',
      judgeName: '',
      status: 'SCHEDULED',
    });
    checkConflicts();
  };

  const handlePostponement = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(`/api/hearings/${postponementForm.hearingId}/postponements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: postponementForm.reason,
        newStartsAt: postponementForm.newStartsAt,
        newEndsAt: postponementForm.newEndsAt,
      }),
    });
    const data = await response.json();
    setHearings((prev) => prev.map(h => h.id === data.hearingId ? data : h));
    setPostponementForm({
      hearingId: '',
      reason: '',
      newStartsAt: '',
      newEndsAt: '',
    });
    setPostponementErrors(null);
    checkConflicts();
  };

  return (
    <div className="p-6 bg-bg text-text">
      <h1 className="text-2xl font-bold mb-6">Jadwal Sidang</h1>

      <Card className="mb-6">
        <h2 className="text-xl font-medium mb-4">Buat Jadwal Baru</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Perkara</label>
              <input
                placeholder="Nomor perkara"
                value={newHearing.caseId}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, caseId: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mulai</label>
              <input
                type="datetime-local"
                placeholder="Waktu mulai"
                value={newHearing.startsAt}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, startsAt: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Selesai</label>
              <input
                type="datetime-local"
                placeholder="Waktu selesai"
                value={newHearing.endsAt}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, endsAt: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ruang Pengadilan</label>
              <input
                placeholder="Nama ruang"
                value={newHearing.courtroom}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, courtroom: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hakim</label>
              <input
                placeholder="Nama hakim"
                value={newHearing.judgeName}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, judgeName: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={newHearing.status}
                onChange={(e) =>
                  setNewHearing({ ...newHearing, status: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="POSTPONED">POSTPONED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <Card className="mt-4">
            <h3 className="text-sm font-medium mb-3">Permohonan Penundaan</h3>
            {postponementErrors && (
              <p className="text-sm text-red-600">{postponementErrors}</p>
            )}
            <form
              onSubmit={handlePostponement}
              className="space-y-3"
            >
              <input
                type="hidden"
                value={hearings.length > 0 ? hearings[0].id : ''}
                defaultValue={hearings.length > 0 ? hearings[0].id : ''}
                ref={el => (postponementForm.hearingId = el.value)}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Alasan Penundaan</label>
                <textarea
                  value={postponementForm.reason}
                  onChange={(e) =>
                    setPostponementForm({ ...postponementForm, reason: e.target.value })
                  }
                  placeholder="Misal: hakim sakit, saksi tidak datang, atau alasan lain"
                  rows={3}
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Waktu Mulai Baru</label>
                <input
                  type="datetime-local"
                  value={postponementForm.newStartsAt}
                  onChange={(e) =>
                    setPostponementForm({ ...postponementForm, newStartsAt: e.target.value })
                  }
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Waktu Selesai Baru</label>
                <input
                  type="datetime-local"
                  value={postponementForm.newEndsAt}
                  onChange={(e) =>
                    setPostponementForm({ ...postponementForm, newEndsAt: e.target.value })
                  }
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                />
              </div>
              <button
                type="submit"
                className="btn w-full mt-2"
                disabled={!postponementForm.reason.trim()}
              >
                Kirim Permohonan
              </button>
            </form>
          </Card>

          <button
            type="submit"
            className="btn w-full"
          >
            Buat Jadwal
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-medium mb-4">Daftar Jadwal ({{ hearings.length }})</h2>
        {hearings.length === 0 && (
          <p className="text-muted-foreground">Belum ada data jadwal</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableColumn>Perkara</TableColumn>
              <TableColumn>Mulai</TableColumn>
              <TableColumn>Selesai</TableColumn>
              <TableColumn>Ruang</TableColumn>
              <TableColumn>Hakim</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Aksi</TableColumn>
            </TableRow>
          </TableHeader>
          {hearings.map((hearing) => (
            <TableRow key={hearing.id}>
              <TableCell className="font-medium">{hearing.caseId || '-'}</TableColumn>
              <TableCell>{new Date(hearing.startsAt).toLocaleString()}</TableColumn>
              <TableCell>{new Date(hearing.endsAt).toLocaleString()}</TableColumn>
              <TableCell>{hearing.courtroom || '-'}</TableColumn>
              <TableCell>{hearing.judgeName || '-'}</TableColumn>
              <TableCell>
                <span
                  className={
                    hearing.status === 'SCHEDULED'
                      ? 'badge bg-success'
                      : hearing.status === 'COMPLETED'
                        ? 'badge bg-primary'
                        : hearing.status === 'POSTPONED'
                          ? 'badge bg-warning'
                          : 'badge bg-danger'
                  }
                >
                  {hearing.status}
                </span>
              </TableCell>
              <TableCell>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => window.alert('Edit: ' + hearing.id)
                }
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => window.alert('Hapus: ' + hearing.id)
                }
                >
                  Hapus
                </button>
              </TableCell>
            </TableRow>
          ))}
        </Table>

        {conflicts.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <h3 className="font-medium">Konflik Jadwal Terdeteksi</h3>
            <p className="text-sm text-yellow-800">
              {conflicts.length} pasang jadwal bertabrakan pada ruang yang sama:
              {conflicts.length > 1 ? 'beberapa pasang' : 'satu pasang'}
            </p>
          </div>
        )}
      </Card>

      <Calendar
        events={hearings}
        onEventDrop={onEventDrop}
        onEventResize={onEventResize}
      />
    </div>
  );
}
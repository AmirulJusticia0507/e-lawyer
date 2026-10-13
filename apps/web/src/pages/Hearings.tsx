import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Calendar } from '../components/Calendar';
import { ConflictDetector } from '../components/ConflictDetector';
import { EscalationPanel } from '../components/EscalationPanel';
import { HearingForm, type HearingDraft } from '../components/HearingForm';
import { HearingList } from '../components/HearingList';
import { ReminderPanel } from '../components/ReminderPanel';
import { SlaDashboard } from '../components/SlaDashboard';
import { Button, Card } from '../components/ui';
import type { Hearing } from '../types';

export default function Hearings() {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const canCreate = user?.permissions.includes('CREATE:HEARING') ?? false;

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.listHearings();
      setHearings(data);
      setSelectedId((current) => current ?? data[0]?.id);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat jadwal sidang');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (draft: HearingDraft) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const hearing = await api.createHearing({
        ...draft,
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        notes: draft.notes || undefined,
      });
      setHearings((current) =>
        [...current, hearing].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      );
      setSelectedId(hearing.id);
      setNotice('Jadwal sidang berhasil disimpan.');
      return hearing;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal menyimpan jadwal sidang');
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  const selected = useMemo(
    () => hearings.find((hearing) => hearing.id === selectedId),
    [hearings, selectedId],
  );
  const upcoming = hearings.filter(
    (hearing) => new Date(hearing.endsAt).getTime() >= Date.now(),
  ).length;
  const completed = hearings.filter((hearing) => hearing.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Ruang kendali litigasi</p>
        <h1 className="mt-2 text-2xl font-bold">Agenda Persidangan</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Kelola jadwal, deteksi bentrok ruang, pantau SLA, dan tindak lanjuti pengingat dari satu tampilan.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-600" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600" role="status">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{hearings.length}</div>
          <div className="text-xs text-[var(--muted)]">Total Agenda</div>
        </Card>
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{upcoming}</div>
          <div className="text-xs text-[var(--muted)]">Agenda Aktif</div>
        </Card>
        <Card className="bg-[var(--bg)]/70">
          <div className="text-2xl font-bold">{completed}</div>
          <div className="text-xs text-[var(--muted)]">Sidang Selesai</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daftar Sidang</h2>
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={busy}>
              Muat Ulang
            </Button>
          </div>
          <HearingList
            hearings={hearings}
            selectedId={selectedId}
            onSelect={(hearing) => setSelectedId(hearing.id)}
          />
        </Card>

        {canCreate && (
          <Card className="lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold mb-4">Jadwal Baru</h2>
            <HearingForm onCreate={create} busy={busy} />
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Kalender Sidang</h2>
          <Calendar hearings={hearings} />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-4">Deteksi Bentrok Ruang</h2>
          <ConflictDetector hearings={hearings} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-4">Monitoring SLA</h2>
          <SlaDashboard hearings={hearings} />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-4">Pengingat & Eskalasi</h2>
          <div className="space-y-6">
            <ReminderPanel hearingId={selected?.id} />
            <EscalationPanel hearings={hearings} />
          </div>
        </Card>
      </div>
    </div>
  );
}
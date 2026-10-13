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
    <div className="grid gap-6 pb-10">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
              Ruang kendali litigasi
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Agenda persidangan
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Kelola jadwal, deteksi bentrok ruang, pantau SLA, dan tindak lanjuti pengingat dari
              satu tampilan.
            </p>
          </div>
          <Button
            className="bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]"
            onClick={() => void load()}
            disabled={busy}
          >
            Muat ulang data
          </Button>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <Metric label="Total agenda" value={hearings.length} />
          <Metric label="Agenda aktif" value={upcoming} />
          <Metric label="Sidang selesai" value={completed} />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"
        >
          {notice}
        </div>
      )}

      <div
        className={`grid gap-6 ${canCreate ? 'xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.85fr)]' : ''}`}
      >
        <HearingList
          hearings={hearings}
          selectedId={selectedId}
          onSelect={(hearing) => setSelectedId(hearing.id)}
        />
        {canCreate && <HearingForm onCreate={create} busy={busy} />}
      </div>

      <Calendar hearings={hearings} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ConflictDetector hearings={hearings} />
        <SlaDashboard hearings={hearings} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReminderPanel hearingId={selected?.id} />
        <EscalationPanel hearings={hearings} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-0 bg-[var(--bg)]/70 p-4 shadow-none">
      <span className="block text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
    </Card>
  );
}

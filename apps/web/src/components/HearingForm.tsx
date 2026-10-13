import { useState, type FormEvent } from 'react';
import type { Hearing } from '../types';
import { Button, Card, Field, Input, Textarea } from './ui';

export interface HearingDraft {
  caseId: string;
  startsAt: string;
  endsAt: string;
  courtroom: string;
  judgeName: string;
  notes: string;
}

const initialDraft: HearingDraft = {
  caseId: '',
  startsAt: '',
  endsAt: '',
  courtroom: '',
  judgeName: '',
  notes: '',
};

export function HearingForm({
  onCreate,
  busy,
}: {
  onCreate: (draft: HearingDraft) => Promise<Hearing>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onCreate(draft);
    setDraft(initialDraft);
  };
  return (
    <Card>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Agenda baru
        </p>
        <h2 className="mt-1 text-xl font-bold">Jadwalkan sidang</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lengkapi waktu, ruang, dan penanggung jawab persidangan.
        </p>
      </div>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="ID perkara">
          <Input
            value={draft.caseId}
            onChange={(event) => setDraft({ ...draft, caseId: event.target.value })}
            placeholder="UUID perkara"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mulai">
            <Input
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
              required
            />
          </Field>
          <Field label="Selesai">
            <Input
              type="datetime-local"
              value={draft.endsAt}
              onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ruang sidang">
            <Input
              value={draft.courtroom}
              onChange={(event) => setDraft({ ...draft, courtroom: event.target.value })}
              placeholder="Ruang Cakra"
              required
            />
          </Field>
          <Field label="Majelis hakim">
            <Input
              value={draft.judgeName}
              onChange={(event) => setDraft({ ...draft, judgeName: event.target.value })}
              placeholder="Nama hakim"
              required
            />
          </Field>
        </div>
        <Field label="Catatan">
          <Textarea
            rows={3}
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            placeholder="Agenda atau kebutuhan khusus (opsional)"
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan jadwal'}
        </Button>
      </form>
    </Card>
  );
}

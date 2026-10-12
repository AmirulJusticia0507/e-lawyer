import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import { useAuth } from '../auth/AuthContext';
import type { CaseSummary, Hearing, HearingSla, SlaStatus } from '../types';

function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function weekRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

function slaStatusLabel(status: SlaStatus): string {
  const labels: Record<SlaStatus, string> = {
    ON_TRACK: 'Sesuai',
    AT_RISK: 'Risiko',
    BREACHED: 'Terlambat',
    COMPLETED: 'Selesai',
  };
  return labels[status] || status;
}

export default function Hearings() {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function fetchHearings() {
    return api
      .listHearings()
      .then((data) => {
        setHearings(data);
        setNotice(undefined);
      })
      .catch((err) => {
        setNotice(err instanceof ApiError ? err.message : 'Gagal memuat data');
      });
  }

  useEffect(() => {
    fetchHearings();
  }, []);

  return (
    <section className="card">
      <h2>Agenda tujuh hari ke depan</h2>
      {hearings.length === 0 ? (
        <p className="muted">Belum ada jadwal sidang dalam rentang ini.</p>
      ) : (
        <div className="hearing-list">
          {hearings.map((hearing) => {
            const slaStatus = 'ON_TRACK'; // placeholder - in real app would fetch per hearing
            return (
              <article className="hearing-item" key={hearing.id}>
                <time className="hearing-time" dateTime={hearing.startsAt}>
                  {new Date(hearing.startsAt).toLocaleString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' – '}
                  {new Date(hearing.endsAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <div>
                  <strong>{hearing.case.caseNumber}</strong>
                  <span>{hearing.case.title}</span>
                </div>
                <div>
                  <span>{hearing.judgeName}</span>
                  <span className="muted">{hearing.courtroom}</span>
                </div>
                {hearing.notes && <p className="muted">{hearing.notes}</p>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
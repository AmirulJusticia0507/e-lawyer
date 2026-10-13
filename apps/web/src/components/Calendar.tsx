import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { Hearing } from '../types';
import { Card, EmptyState } from './ui';

export function Calendar({ hearings }: { hearings: Hearing[] }) {
  const events = useMemo(
    () =>
      hearings.map((hearing) => ({
        id: hearing.id,
        title: `${hearing.case.caseNumber} · ${hearing.courtroom}`,
        start: hearing.startsAt,
        end: hearing.endsAt,
      })),
    [hearings],
  );
  return (
    <Card className="overflow-hidden">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Kalender
        </p>
        <h2 className="mt-1 text-xl font-bold">Agenda persidangan</h2>
      </div>
      {events.length === 0 ? (
        <EmptyState
          title="Kalender masih kosong"
          description="Jadwal baru akan langsung tampil di kalender."
        />
      ) : (
        <div className="hearing-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin] as never[]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            events={events}
            height="auto"
            locale="id"
          />
        </div>
      )}
    </Card>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDroppable, useDraggable } from 'react-beautiful-dnd';
import FullCalendar, { EventInput } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { Button } from '@/components/ui';

interface CalendarProps {
  events: any[];
  onEventDrop: (event: any) => void;
  onEventResize: (event: any) => void;
}

export function Calendar({ events, onEventDrop, onEventResize }: CalendarProps) {
  const [events, setEvents] = useState<EventInput[]>(events || []);
  const calendarRef = useRef<FullCalendar.AnyFullCalendar>();

  useEffect(() => {
    setEvents(events.map((event) => ({
      id: event.id || event.id,
      title: event.title || 'Jadwal Sidang',
      start: event.startsAt,
      end: event.endsAt,
      // tambahkan className untuk identifikasi saat drag
      className: `hearing-event ${event.courtroom || ''}`,
      // tambahkan data khas untuk validasi
      extension: {
        caseId: event.caseId,
        courtroom: event.courtroom,
        judgeName: event.judgeName,
      },
    }));
  }, [events]);

  const handleEventDrop = (info: any) => {
    // Validasi konflik sebelum menyimpan
    const conflictingEvents = events.filter(
      (e) =>
        e.id !== info.event.id &&
        e.start !== info.event.start && // different start time
        // check overlap logic
        new Date(e.start).getTime() < new Date(info.event.end).getTime() &&
        new Date(info.event.start).getTime() < new Date(e.end).getTime()
    );

    if (conflictingEvents.length > 0) {
      // kembalikan ke posisi sebelumnya
      onEventDrop?.(info.oldEvent);
      alert('Terdapat konflik jadwal! Sidang bertabrakan pada ruang/time yang sama.');
      return;
    }

    // Simpan perubahan ke backend
    onEventDrop?.(info.event);
  };

  const handleEventResize = (info: any) => {
    // Validasi kembali
    onEventResize?.(info.event);
  };

  return (
    <DndProvider>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView='dayGridMonth'
        height='500'
        editable={true}
        eventDragAndDrop={true}
        eventResize={handleEventResize}
        events={events}
        drop={(info) => {
          // saat drag selesai, panggil validasi
          handleEventDrop(info);
        }}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      >
        <FullCalendar.EventRoot>
          {({ event, canDrop, isDragging }) => {
            return (
              <div
                className={`hearing-event ${canDrop ? '' : 'not-allowed'} ${isDragging ? 'dragging' : ''}`}
                style={{ borderLeft: '3px solid #4f7cff' }}
              >
                <div className="fc-event-container">
                  <span className="fc-event-time">
                    {new Date(event.start).toLocaleString('id-ID')}
                  </span>
                  <span className="fc-event-title">
                    {event.title}
                  </span>
                </div>
              </div>
            </FullCalendar.EventRoot>
          }
        </FullCalendar.EventRoot>
      </FullCalendar>
    </DndProvider>
  );
}
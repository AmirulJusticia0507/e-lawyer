import React, { useState, useEffect } from 'react';

export function ConflictDetector({ hearings }: { hearings: any[] }) {
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const conflicts: any[] = [];
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
  }, [hearings]);

  return (
    <div className="p-4 bg-yellow-50 rounded">
      <h3 className="font-medium mb-2">Deteksi Bentrok Jadwal</h3>
      {conflicts.length === 0 ? (
        <p className="text-green-600">Tidak ada bentrok jadwal</p>
      : (
        <div>
          <p className="text-red-600">
            {conflicts.length} pasang jadwal bertabrakan:
            {conflicts.length > 1 ? 'beberapa pasang' : 'satu pasang'}
          </p>
          <ul className="list-disc list-inside mt-2">
            {conflicts.map((c, idx) => (
              <li key={idx}>
                <strong>Ruang:</strong> {c.hearingA.courtroom} & {c.hearingB.courtroom}{' '}
                <strong>Waktu:</strong> {new Date(c.hearingA.startsAt).toLocaleString()} vs {new Date(c.hearingB.startsAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
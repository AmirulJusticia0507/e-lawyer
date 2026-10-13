import React, { useState, useEffect } from 'react';

interface EscalationItem {
  id: string;
  hearingId: string;
  caseId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  status: 'PENDING' | 'RESOLVED';
}

interface EscalationPanelProps {
  hearings: any[];
}

export function EscalationPanel({ hearings }: EscalationPanelProps) {
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newEscalation, setNewEscalation] = useState({
    caseId: '',
    reason: '',
    severity: 'MEDIUM',
  });

  useEffect(() => {
    // Placeholder - in real app would fetch escalations from API
    const mockEscalations: EscalationItem[] = hearings
      .filter((h) => new Date().getTime() - new Date(h.startsAt).getTime() > 7 * 24 * 60 * 60_000) // > 7 days late
      .map((h) => ({
        id: `esc-${h.id}`,
        hearingId: h.id,
        caseId: h.caseId,
        reason: 'Sidang melewati batas waktu SLA',
        severity: 'HIGH',
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      }));
    setEscalations(mockEscalations);
  }, [hearings]);

  const handleDelete = (id: string) => {
    setEscalations((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="p-4 bg-red-50 rounded">
      <h3 className="font-medium mb-4">Escalation Pengawar</h3>
      <p className="text-sm text-red-600 muted">
        Sidang yang melewati batas SLA atau memiliki keterlambatan signifikan akan
        dialokasikan untuk pengawasan penawar.
      </p>

      <div className="space-y-4">
        {escalations.length === 0 ? (
          <p className="text-green-600">Tidak ada escalasi yang aktif</p>
        : (
          <div>
            <p className="text-red-600 font-medium">
              {escalations.length} sidang dalam escalasi pengawar
            </p>
            <ul className="list-disc list-inside mt-2">
              {escalations.map((e) => (
                <li key={e.id} className="mb-2">
                  <strong>Sidang:</strong> {e.caseId}{' '}
                  <span className="text-sm text-red-500">melewati SLA</span>
                  <button
                    className="btn btn-sm btn-outline float-right"
                    onClick={() => handleDelete(e.id)}
                  >
                    Resolved
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const newEscalation: EscalationItem = {
              id: `esc-${Date.now()}`,
              caseId: newEscalation.caseId,
              reason: newEscalation.reason,
              severity: newEscalation.severity,
              createdAt: new Date().toISOString(),
              status: 'PENDING',
            };
            setEscalations((prev) => [...prev, newEscalation]);
            setShowForm(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-2">Case ID</label>
              <input
                value={newEscalation.caseId}
                onChange={(e) =>
                  setNewEscalation({ ...newEscalation, caseId: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alasan</label>
              <input
                value={newEscalation.reason}
                onChange={(e) =>
                  setNewEscalation({ ...newEscalation, reason: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Severitas</label>
              <select
                value={newEscalation.severity}
                onChange={(e) =>
                  setNewEscalation({ ...newEscalation, severity: e.target.value })
                }
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="btn">
              Kirim Escalation
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowForm(false)}
            >
              Batal
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
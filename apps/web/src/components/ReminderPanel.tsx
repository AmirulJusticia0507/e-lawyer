import React, { useState, useEffect } from 'react';

export function ReminderPanel({ hearingId }: { hearingId: string }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    type: 'H-7',
    triggerAt: new Date().toISOString(),
    deliveryMethod: 'email',
  });

  useEffect(() => {
    // Placeholder - in real app would fetch reminders from API
    setReminders([
      { id: '1', type: 'H-7', triggerAt: new Date().toISOString(), delivered: false },
      { id: '2', type: 'H-3', triggerAt: new Date(Date.now() + 24 * 60_000).toISOString(), delivered: false },
    ]);
  }, [hearingId]);

  const handleDelete = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-medium mb-4">Reminder Jadwal Sidang</h3>

      <div className="mb-4">
        <p className="text-sm muted">
          Set reminder untuk jadwal sidang ID: {hearingId}
        </p>
      </div>

      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="p-3 bg-white rounded">
            <div className="flex items-between">
              <span>
                <strong>{reminder.type}</strong> - {new Date(reminder.triggerAt).toLocaleString()}
              </span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(reminder.id)}
              >
                Hapus
              </button>
            </div>
          </div>
        ))}

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const newId = `reminder-${Date.now()}`;
              setReminders((prev) => [...prev, { ...newReminder, id: newId, delivered: false }]);
              setShowForm(false);
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={newReminder.type}
                  onChange={(e) =>
                  setNewReminder({ ...newReminder, type: e.target.value })
                }
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                >
                  <option value="H-7">H-7 (7 hari sebelum)</option>
                  <option value="H-3">H-3 (3 hari sebelum)</option>
                  <option value="H-1">H-1 (1 hari sebelum)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <input
                  type="datetime-local"
                  value={newReminder.triggerAt}
                  onChange={(e) => setNewReminder({ ...newReminder, triggerAt: e.target.value })}
                  className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                />
              </div>
            </div>
            <div>
              <select
                value={newReminder.deliveryMethod}
                onChange={(e) => setNewReminder({ ...newReminder, deliveryMethod: e.target.value })}
                className="w-full border border-border rounded px-3 py-2 bg-surface text-text"
                >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">Push Notifikasi</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <button type="submit" className="btn">
                Simpan Reminder
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowForm(false)}
              >
                Batal
              </button>
            </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
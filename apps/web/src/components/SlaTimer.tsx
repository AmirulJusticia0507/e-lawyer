import React, { useState, useEffect } from 'react';

export function SlaTimer({ hearingId }: { hearingId: string }) {
  const [slaTimer, setSlaTimer] = useState<any>(null);
  const [status, setStatus] = useState<'ON_TRACK' | 'AT_RISK' | 'BREACHED'>('ON_TRACK');

  useEffect(() => {
    // Placeholder SLA logic - in real app would calculate based on hearing deadline
    const now = new Date();
    const hearingStart = new Date('2024-12-20T09:00:00'); // placeholder hearing start
    const deadline = new Date('2024-12-20T17:00:00'); // placeholder deadline

    let status = 'ON_TRACK';
    let slaTimer = null;

    if (now > deadline) {
      status = 'BREACHED';
      slaTimer = { status: 'BREACHED', minutesOverdue: Math.floor((now.getTime() - deadline.getTime()) / 60_000) };
    } else if (now > new Date(deadline.getTime() - 60_000)) {
      status = 'AT_RISK';
      slaTimer = { status: 'AT_RISK', minutesUntilDeadline: Math.floor((deadline.getTime() - now.getTime()) / 60_000) };
    } else {
      slaTimer = { status: 'ON_TRACK', minutesUntilDeadline: Math.floor((deadline.getTime() - now.getTime()) / 60_000) };
    }

    setStatus(status);
    setSlaTimer(slaTimer);
  }, [hearingId]);

  if (!slaTimer) return null;

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3 className="font-medium mb-2">Timer SLA</h3>
      <div className="p-3 bg-{status === 'BREACHED' ? 'red-100' : status === 'AT_RISK' ? 'yellow-100' : 'green-100'} rounded">
        <p className="muted">
          {status === 'ON_TRACK'
            ? 'SLA aman - {slaTimer.minutesUntilDeadline} menit lagi'
            : status === 'AT_RISK'
              ? 'SLA berisiko - {slaTimer.minutesUntilDeadline} menit lagi'
              : 'SLA TERLAMBAT - {slaTimer.minutesOverdue} menit sudah lewat'}
          </p>
        <p className="mt-2">{status === 'ON_TRACK' ? 'Sistem berjalan normal' : 'Awas! SLA akan breached'}.</p>
      </div>
    </div>
  );
}
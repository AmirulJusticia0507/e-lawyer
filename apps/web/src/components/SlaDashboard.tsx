import React, { useState, useEffect } from 'react';

interface HearingSLA {
  id: string;
  caseId: string;
  hearingDate: string;
  startTime: string;
  endTime: string;
  courtroom: string;
  judgeName: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  daysUntilHearing: number;
  daysUntilDeadline: number;
  isBreached: boolean;
}

interface SlaDashboardProps {
  hearings: any[];
}

export function SlaDashboard({ hearings }: SlaDashboardProps) {
  const [slaData, setSlaData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const calculateSla = (hearings: any[]) => {
      const now = new Date();
      const slaData = hearings.map((hearing) => {
        const hearingDate = new Date(hearing.startsAt);
        const deadline = new Date(hearing.startsAt);
        deadline.setDate(deadline.getDate() - 7); // H-7 deadline

        const daysUntilHearing = Math.ceil(
          (hearingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' = 'ON_TRACK';
        let isBreached = false;

        if (now > deadline) {
          status = 'BREACHED';
          isBreached = true;
        } else if (now > deadline) {
          status = 'AT_RISK';
        }

        return {
          id: hearing.id,
          caseId: hearing.caseId,
          hearingDate: hearing.startsAt,
          startTime: hearing.startsAt,
          endTime: hearing.endsAt,
          courtroom: hearing.courtroom,
          judgeName: hearing.judgeName,
          status,
          daysUntilHearing,
          daysUntilDeadline,
          isBreached,
        };
      });
      setSlaData(slaData);
      setLoading(false);
    };

    if (hearings.length > 0) {
      calculateSla(hearings);
    } else {
      setLoading(false);
    }
  }, [hearings]);

  if (loading) {
    return <div className="p-4">Memuat data SLA...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Dashboard SLA Sidang</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {slaData.map((item) => (
          <div key={item.id} className={`p-4 rounded bg-${item.isBreached ? 'red-100' : item.status === 'AT_RISK' ? 'yellow-100' : 'green-100'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{item.caseId}</h3>
                <p className="text-sm muted">H-{item.daysUntilHearing} ke sidang</p>
              </div>
              <div>
                <span className={item.isBreached ? 'text-red-600' : item.status === 'AT_RISK' ? 'text-yellow-600' : 'text-green-600'>
                  {item.status}
                </span>
              </div>
            </div>
            <p className="text-sm muted">
              H-{item.daysUntilDeadline} ke deadline SLA
              {item.isBreached && <span className="text-red-500"> (BREACHED)</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
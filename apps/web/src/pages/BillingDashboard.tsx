import React, { useState, useEffect } from 'react';
import { Card, Table, TableBody, TableHeader, TableRow, TableCell, Button, Input, Select } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';

export function BillingDashboard() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/time-entries?caseId=&userId=' + user?.id)
      .then((res) => res.json())
      .then((data) => {
        setTimeEntries(data);
        setLoading(false);
      });
    
    fetch('/api/billing/invoices')
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setLoading(false);
      });
  }, [user?.id]);

  return (
    <div className="p-6 bg-bg text-text">
      <h1 className="text-2xl font-bold mb-6">Dashboard Keuangan</h1>
      
      {loading ? (
        <p className="muted">Memuat data...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Timesheet Card */}
          <Card>
            <h3 className="text-xl font-medium mb-4">Timesheet</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableColumn>Perkara</TableColumn>
                  <TableColumn>Deskripsi</TableColumn>
                  <TableColumn>Jam Kerja</TableColumn>
                  <TableColumn>Tarif</TableColumn>
                  <TableColumn>Amount</TableColumn>
                </TableRow>
              </TableHeader>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.case?.caseNumber || '-'}</TableCell>
                  <TableCell>{entry.description || '-'}</TableCell>
                  <TableCell>{entry.durationMinutes ? `${entry.durationMinutes} menit` : '-'}</TableCell>
                  <TableCell>{entry.hourlyRate || '0'}</TableCell>
                  <TableCell>{entry.amount || 0}</TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          {/* Invoices Card */}
          <Card>
            <h3 className="text-xl font-medium mb-4">Invoice</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableColumn>No Invoice</TableColumn>
                  <TableColumn>Perkara</TableColumn>
                  <TableColumn>Total</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>Aksi</TableColumn>
                </TableRow>
              </TableHeader>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNo || invoice.id.substring(0, 8)}</TableCell>
                  <TableCell>{invoice.case?.caseNumber || '-'}</TableCell>
                  <TableCell>{invoice.total ?? 0}</TableCell>
                  <TableCell>
                    <span
                      className={
                        invoice.status === 'PAID'
                          ? 'badge bg-success'
                          : invoice.status === 'PARTIALLY_PAID'
                            ? 'badge bg-warning'
                            : 'badge bg-secondary'
                      }
                    >
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="btn btn-sm btn-outline">Lihat</button>
                    <button className="btn btn-sm btn-danger">Batal</button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
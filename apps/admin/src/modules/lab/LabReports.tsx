import { useState } from 'react';

import type { AdminLevel } from '../../nav';
import { labOrders, labPackages, partnerName, testName, type LabOrder } from '../../mock/ops/lab';
import { Button, Modal, StatusBadge, type Column } from '../../ui';
import { fmtDate } from '../kit/format';
import { ListScreen, type ListTab } from '../kit/ListScreen';
import { useStore } from '../kit/store';

/**
 * Lab Reports (requirements §68, §69). A report file is only ever opened from
 * authenticated CoraCure systems - there is deliberately no "send" action, and
 * nothing here can post a report or prescription to WhatsApp.
 */

const TABS: ListTab<LabOrder>[] = [
  { id: 'pending', label: 'Pending', test: (o) => o.reportStatus === 'pending' },
  { id: 'processing', label: 'Processing', test: (o) => o.reportStatus === 'processing' },
  { id: 'report_ready', label: 'Report Ready', test: (o) => o.reportStatus === 'report_ready' },
  { id: 'completed', label: 'Completed', test: (o) => o.reportStatus === 'completed' },
];

const turnaround = (o: LabOrder): string => {
  if (!o.sampleCollectedAt || !o.reportDate) return '-';
  const hours = Math.round((new Date(o.reportDate).getTime() - new Date(o.sampleCollectedAt).getTime()) / 3_600_000);
  return `${Math.max(hours, 0)} h`;
};

export function LabReports({ level: _level }: { level: AdminLevel }) {
  const rows = useStore(labOrders).filter((o) => o.payment.status === 'paid');
  const [viewing, setViewing] = useState<LabOrder | null>(null);

  const columns: Column<LabOrder>[] = [
    { key: 'patient', header: 'Patient', render: (o) => o.patientName },
    { key: 'order', header: 'Lab Order ID', render: (o) => o.code },
    { key: 'partner', header: 'Lab Partner', render: (o) => partnerName(o.partnerId) },
    {
      key: 'tests',
      header: 'Test / package',
      render: (o) => (o.packageId ? (labPackages.get(o.packageId)?.name ?? 'Package') : o.testIds.map(testName).join(', ')),
    },
    { key: 'sample', header: 'Sample collected', render: (o) => fmtDate(o.sampleCollectedAt) },
    { key: 'status', header: 'Report status', render: (o) => <StatusBadge status={o.reportStatus} /> },
    { key: 'date', header: 'Report date', render: (o) => fmtDate(o.reportDate) },
    {
      key: 'file',
      header: 'Report file',
      render: (o) =>
        o.reportDate ? (
          <Button size="sm" variant="ghost" icon="eye" onClick={() => setViewing(o)}>
            {`report-${o.code}.pdf`}
          </Button>
        ) : (
          <span className="muted">Not available yet</span>
        ),
    },
    { key: 'tat', header: 'Turnaround', render: turnaround },
  ];

  return (
    <>
      <ListScreen
        caption="Lab reports"
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        tabs={TABS}
        search={(o) => `${o.code} ${o.patientName}`}
        searchPlaceholder="Patient or order ID"
        emptyIcon="note"
        empty={{ title: 'No reports yet' }}
      />
      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? `Report ${viewing.code}` : 'Report'} width={520}>
        {/* ponytail: the fixtures hold no file bytes; live streams the PDF through an authenticated endpoint. */}
        <p>
          The report file for <strong>{viewing?.patientName}</strong> would render here, streamed through an authenticated CoraCure endpoint. It is never emailed or sent over WhatsApp.
        </p>
      </Modal>
    </>
  );
}

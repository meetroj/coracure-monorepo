import { useState } from 'react';

import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  BOOKING_SOURCES,
  COLLECTION_STATUSES,
  LAB_ORDER_STATUSES,
  acceptOrder,
  eligiblePartners,
  labOrders,
  labPackages,
  labPartners,
  partnerName,
  testName,
  type LabOrder,
} from '../../mock/ops/lab';
import { Button, Card, DefinitionList, Modal, Notice, SelectField, StatusBadge, TextField, type Column } from '../../ui';
import { fmtDate, fmtDateTime, inr, opts, words } from '../kit/format';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import { useStore } from '../kit/store';

/**
 * Lab Orders (requirements §51-§56, §66, §67, §70).
 *
 * Collection and recollection live inside the order, not on a screen of their
 * own (§104, §105). The allocation card shows the PIN code + first acceptance
 * rule at work: partners accept from their own app, so the buttons here stand
 * in for that - the first one to accept locks the order and the rest close.
 */

const FLOW = [
  'Patient picks tests',
  'Confirms address and PIN code',
  'Eligible partners identified',
  'Payment completed',
  'Request sent to eligible partners',
  'First eligible partner accepts',
  'Other requests close',
  'Patient confirmed',
];

const ORDER_ACTIONS = LAB_ORDER_STATUSES.map((s) => ({ value: s, label: words(s) }));

export function LabOrders({ level: _level }: { level: AdminLevel }) {
  const rows = useStore(labOrders);
  const partners = useStore(labPartners);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((o) => o.id === openId) ?? null;

  const filters: ListFilter<LabOrder>[] = [
    { key: 'status', label: 'Order status', options: opts(LAB_ORDER_STATUSES), test: (o, v) => o.status === v },
    { key: 'source', label: 'Booking source', options: opts(BOOKING_SOURCES), test: (o, v) => o.source === v },
    { key: 'collection', label: 'Collection status', options: opts(COLLECTION_STATUSES), test: (o, v) => o.collection === v },
    { key: 'partner', label: 'Lab partner', options: partners.map((p) => ({ value: p.id, label: p.name })), test: (o, v) => o.partnerId === v },
  ];

  const columns: Column<LabOrder>[] = [
    {
      key: 'order',
      header: 'Lab order',
      render: (o) => (
        <span className="cellStack">
          <strong>{o.code}</strong>
          <small>{fmtDateTime(o.orderedAt)}</small>
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (o) => (
        <span className="cellStack">
          <span>{o.patientName}</span>
          <small>{o.patientId}</small>
        </span>
      ),
    },
    { key: 'source', header: 'Booking source', render: (o) => words(o.source) },
    {
      key: 'tests',
      header: 'Tests',
      render: (o) => (
        <span className="cellStack">
          <span>{o.packageId ? (labPackages.get(o.packageId)?.name ?? 'Package') : o.testIds.map(testName).join(', ')}</span>
          <small>{o.testIds.length} in the battery</small>
        </span>
      ),
    },
    {
      key: 'where',
      header: 'Collection',
      render: (o) => (
        <span className="cellStack">
          <span>PIN {o.pinCode}</span>
          <small>{o.window}</small>
        </span>
      ),
    },
    { key: 'partner', header: 'Lab partner', render: (o) => partnerName(o.partnerId) },
    { key: 'status', header: 'Order status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'collection', header: 'Collection status', render: (o) => <StatusBadge status={o.collection} /> },
    { key: 'report', header: 'Report', render: (o) => <StatusBadge status={o.reportStatus} /> },
    {
      key: 'payment',
      header: 'Payment',
      render: (o) => (
        <span className="cellStack">
          <StatusBadge status={o.payment.status} />
          {o.refund !== 'none' && <small>Refund {o.refund}</small>}
        </span>
      ),
    },
  ];

  return (
    <>
      <ListScreen
        caption="Lab orders"
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        onOpen={(o) => setOpenId(o.id)}
        search={(o) => `${o.code} ${o.patientName} ${o.patientId} ${o.pinCode}`}
        searchPlaceholder="Order ID, patient or PIN code"
        filters={filters}
        emptyIcon="lab"
        empty={{ title: 'No lab orders yet' }}
      />
      {open && <OrderModal order={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function OrderModal({ order, onClose }: { order: LabOrder; onClose: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<string>(order.status);
  const [collection, setCollection] = useState<string>(order.collection);
  const [date, setDate] = useState(order.confirmedDate ?? '');
  const [time, setTime] = useState(order.confirmedTime ?? '');
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const eligible = eligiblePartners(order.pinCode, order.testIds);
  const awaiting = !order.partnerId && order.status !== 'payment_pending' && order.payment.status === 'paid';

  const saveCollection = () => {
    labOrders.patch(order.id, {
      collection: collection as LabOrder['collection'],
      confirmedDate: date || null,
      confirmedTime: time || null,
      sampleCollectedAt:
        collection === 'sample_collected' && !order.sampleCollectedAt ? new Date().toISOString() : order.sampleCollectedAt,
    });
    toast.success('Collection updated.');
  };

  const requestRecollection = () => {
    if (!reason.trim() || !newDate) {
      toast.error('Give a reason and a new collection date.');
      return;
    }
    labOrders.patch(order.id, {
      collection: 'recollection_required',
      recollection: {
        reason: reason.trim(),
        originalDate: order.confirmedDate ?? new Date().toISOString().slice(0, 10),
        newDate,
        newTime: newTime || '09:00',
        status: 'required',
      },
    });
    toast.success('Recollection required.');
  };

  return (
    <Modal open onClose={onClose} title={`Lab order ${order.code}`} width={820}>
      <div className="stack">
        <Card title="Order">
          <DefinitionList
            items={[
              { label: 'CoraCure Lab Order ID', value: order.code },
              { label: 'Patient', value: `${order.patientName} (${order.patientId})` },
              { label: 'Order date/time', value: fmtDateTime(order.orderedAt) },
              { label: 'Booking source', value: words(order.source) },
              { label: 'Selected tests', value: order.testIds.map(testName).join(', ') },
              { label: 'Package', value: order.packageId ? labPackages.get(order.packageId)?.name : 'None' },
              { label: 'Total test battery', value: order.testIds.length },
              { label: 'Collection address', value: `${order.address}, PIN ${order.pinCode}` },
              { label: 'Preferred collection window', value: order.window },
              { label: 'Allocated lab partner', value: partnerName(order.partnerId) },
              { label: 'Order status', value: <StatusBadge status={order.status} /> },
            ]}
          />
          <div className="filterBar">
            <SelectField label="Move order to" options={ORDER_ACTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
            <Button
              variant="primary"
              disabled={status === order.status}
              onClick={() => {
                labOrders.patch(order.id, { status: status as LabOrder['status'] });
                toast.success(`Order moved to ${words(status)}.`);
              }}
            >
              Apply
            </Button>
          </div>
        </Card>

        <Card title="Allocation: PIN code + first acceptance">
          <ol className="flow">
            {FLOW.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
          {order.partnerId ? (
            <Notice>
              Locked to <strong>{partnerName(order.partnerId)}</strong>. Requests to every other partner are closed, so the order cannot be allocated twice.
            </Notice>
          ) : order.payment.status !== 'paid' ? (
            <Notice tone="warning">Requests go out only after payment succeeds.</Notice>
          ) : eligible.length === 0 ? (
            <Notice tone="danger">
              No partner is eligible: none is active, serves PIN {order.pinCode}, collects at home and runs the whole battery. Refund or re-book.
            </Notice>
          ) : (
            <>
              <p className="muted">
                {eligible.length} eligible partner(s) were sent this request. Partners accept from their own app; use these to stand in for that.
              </p>
              <div className="row">
                {eligible.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    disabled={!awaiting}
                    onClick={() => {
                      const won = acceptOrder(order.id, p.id);
                      if (won) toast.success(`${p.name} accepted first. Other requests closed.`);
                      else toast.error('Already allocated. Duplicate allocation is not allowed.');
                    }}
                  >
                    {p.name} accepts
                  </Button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Collection management">
          <DefinitionList
            items={[
              { label: 'Preferred window', value: order.window },
              { label: 'Confirmed collection', value: order.confirmedDate ? `${fmtDate(order.confirmedDate)} ${order.confirmedTime ?? ''}` : null },
              { label: 'Sample collected', value: fmtDateTime(order.sampleCollectedAt) },
              { label: 'Collection status', value: <StatusBadge status={order.collection} /> },
            ]}
          />
          <div className="formGrid">
            <SelectField label="Collection status" options={opts(COLLECTION_STATUSES)} value={collection} onChange={(e) => setCollection(e.target.value)} />
            <TextField label="Confirmed date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <TextField label="Confirmed time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="formActions">
            <Button variant="primary" onClick={saveCollection}>
              Save collection
            </Button>
          </div>

          <h3 className="subhead">Recollection</h3>
          {order.recollection ? (
            <DefinitionList
              items={[
                { label: 'Reason for recollection', value: order.recollection.reason },
                { label: 'Lab partner', value: partnerName(order.partnerId) },
                { label: 'Original collection date', value: fmtDate(order.recollection.originalDate) },
                { label: 'New collection date', value: fmtDate(order.recollection.newDate) },
                { label: 'New collection time', value: order.recollection.newTime },
                { label: 'Recollection status', value: <StatusBadge status={`recollection_${order.recollection.status}`} /> },
              ]}
            />
          ) : (
            <p className="muted">No recollection on this order.</p>
          )}
          <div className="formGrid">
            <TextField label="Reason for recollection" value={reason} onChange={(e) => setReason(e.target.value)} />
            <TextField label="New collection date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <TextField label="New collection time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          </div>
          <div className="formActions">
            {order.recollection && order.recollection.status !== 'completed' && (
              <Button
                variant="secondary"
                onClick={() => {
                  const next = order.recollection!.status === 'required' ? 'scheduled' : 'completed';
                  labOrders.patch(order.id, {
                    recollection: { ...order.recollection!, status: next },
                    collection: next === 'scheduled' ? 'recollection_scheduled' : 'recollection_completed',
                  });
                }}
              >
                Mark recollection {order.recollection.status === 'required' ? 'scheduled' : 'completed'}
              </Button>
            )}
            <Button variant="secondary" onClick={requestRecollection}>
              Require recollection
            </Button>
          </div>
        </Card>

        <Card title="Payment and refund">
          <DefinitionList
            items={[
              { label: 'Customer amount', value: inr(order.payment.amountInr) },
              { label: 'Payment status', value: <StatusBadge status={order.payment.status} /> },
              { label: 'Transaction reference', value: order.payment.txn },
              { label: 'Payment date/time', value: fmtDateTime(order.payment.at) },
              { label: 'Refund status', value: order.refund === 'none' ? 'None' : words(order.refund) },
            ]}
          />
          <p className="muted small">Lab refunds also appear under Finances, Refunds.</p>
        </Card>
      </div>
    </Modal>
  );
}

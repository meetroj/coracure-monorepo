import { createStore, daysAgo, hoursAgo, inDays } from '../../modules/kit/store';

/**
 * Lab Services fixtures (requirements §50-§70): partners, the CoraCure test
 * master, packages, orders, collection and recollection, and the allocation
 * settings. Everything is in-memory and resets on reload.
 */

/* --------------------------------- partners -------------------------------- */

export type LabPartner = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  cities: string[];
  pinCodes: string[];
  homeCollection: boolean;
  active: boolean;
};

export const labPartners = createStore<LabPartner>([
  { id: 'lp-1', code: 'LP-001', name: 'Sunrise Diagnostics', contactPerson: 'Anil Mehta', phone: '+91 22 4000 1100', email: 'ops@sunrise-diag.example', cities: ['Mumbai', 'Pune'], pinCodes: ['400001', '400050', '411045', '411001'], homeCollection: true, active: true },
  { id: 'lp-2', code: 'LP-002', name: 'CityCare Labs', contactPerson: 'Sheela Rao', phone: '+91 80 4100 2200', email: 'hello@citycare-labs.example', cities: ['Bengaluru'], pinCodes: ['560034', '560001', '560068'], homeCollection: true, active: true },
  { id: 'lp-3', code: 'LP-003', name: 'Metro Path Labs', contactPerson: 'Imran Qureshi', phone: '+91 11 4200 3300', email: 'care@metropath.example', cities: ['New Delhi'], pinCodes: ['110017', '110001', '110024'], homeCollection: true, active: true },
  { id: 'lp-4', code: 'LP-004', name: 'GreenLeaf Pathology', contactPerson: 'Divya Nair', phone: '+91 44 4300 4400', email: 'support@greenleaf-path.example', cities: ['Chennai'], pinCodes: ['600042', '600001'], homeCollection: false, active: false },
]);

/* ---------------------------------- tests ---------------------------------- */

export type LabTest = {
  id: string;
  /** The CoraCure Test ID (§61), unique, e.g. LAB-001. */
  code: string;
  name: string;
  aliases: string[];
  priceInr: number;
  turnaroundHours: number;
  active: boolean;
};

export const labTests = createStore<LabTest>([
  { id: 'lt-1', code: 'LAB-001', name: 'HbA1c', aliases: ['HbA1c', 'HBA1C', 'Glycated Haemoglobin'], priceInr: 450, turnaroundHours: 24, active: true },
  { id: 'lt-2', code: 'LAB-002', name: 'Fasting Blood Sugar', aliases: ['FBS', 'Fasting Glucose'], priceInr: 120, turnaroundHours: 12, active: true },
  { id: 'lt-3', code: 'LAB-003', name: 'Complete Blood Count', aliases: ['CBC', 'Hemogram'], priceInr: 300, turnaroundHours: 12, active: true },
  { id: 'lt-4', code: 'LAB-004', name: 'Thyroid Profile (T3, T4, TSH)', aliases: ['TFT', 'Thyroid Function Test'], priceInr: 600, turnaroundHours: 24, active: true },
  { id: 'lt-5', code: 'LAB-005', name: 'Lipid Profile', aliases: ['Cholesterol Panel', 'Lipid Panel'], priceInr: 550, turnaroundHours: 24, active: true },
  { id: 'lt-6', code: 'LAB-006', name: 'Liver Function Test', aliases: ['LFT'], priceInr: 650, turnaroundHours: 24, active: true },
  { id: 'lt-7', code: 'LAB-007', name: 'Kidney Function Test', aliases: ['KFT', 'RFT', 'Renal Function Test'], priceInr: 600, turnaroundHours: 24, active: true },
  { id: 'lt-8', code: 'LAB-008', name: 'Vitamin D (25-OH)', aliases: ['Vit D', '25 Hydroxy Vitamin D'], priceInr: 900, turnaroundHours: 48, active: true },
  { id: 'lt-9', code: 'LAB-009', name: 'Vitamin B12', aliases: ['B12', 'Cobalamin'], priceInr: 700, turnaroundHours: 48, active: true },
  { id: 'lt-10', code: 'LAB-010', name: 'Serum Ferritin', aliases: ['Ferritin', 'Iron Stores'], priceInr: 500, turnaroundHours: 24, active: false },
]);

/** Which partner runs which test, at what code and price (§60: partner mapping). */
export type LabMapping = {
  id: string;
  partnerId: string;
  testId: string;
  partnerCode: string;
  partnerPriceInr: number;
};

const map = (partnerId: string, testId: string, price: number): LabMapping => ({
  id: `${partnerId}:${testId}`,
  partnerId,
  testId,
  partnerCode: `${partnerId.toUpperCase().replace('LP-', 'P')}-${testId.replace('lt-', 'T')}`,
  partnerPriceInr: price,
});

export const labMappings = createStore<LabMapping>([
  ...['lt-1', 'lt-2', 'lt-3', 'lt-4', 'lt-5', 'lt-6', 'lt-7', 'lt-8'].map((t, i) => map('lp-1', t, [380, 100, 250, 520, 480, 560, 520, 800][i])),
  ...['lt-1', 'lt-2', 'lt-3', 'lt-4', 'lt-5', 'lt-9'].map((t, i) => map('lp-2', t, [420, 110, 280, 560, 520, 650][i])),
  ...['lt-1', 'lt-3', 'lt-5', 'lt-6', 'lt-7', 'lt-8', 'lt-9'].map((t, i) => map('lp-3', t, [400, 270, 500, 600, 560, 850, 680][i])),
  ...['lt-2', 'lt-3'].map((t, i) => map('lp-4', t, [100, 240][i])),
]);

/* -------------------------------- packages --------------------------------- */

export type LabPackage = {
  id: string;
  code: string;
  partnerId: string;
  name: string;
  testIds: string[];
  priceInr: number;
  active: boolean;
};

export const labPackages = createStore<LabPackage>([
  { id: 'pk-1', code: 'PKG-001', partnerId: 'lp-1', name: 'Diabetes Care Panel', testIds: ['lt-1', 'lt-2', 'lt-7'], priceInr: 850, active: true },
  { id: 'pk-2', code: 'PKG-002', partnerId: 'lp-1', name: 'Basic Health Check', testIds: ['lt-3', 'lt-5', 'lt-6', 'lt-7'], priceInr: 1500, active: true },
  { id: 'pk-3', code: 'PKG-003', partnerId: 'lp-2', name: 'Thyroid and Vitamins', testIds: ['lt-4', 'lt-9'], priceInr: 1100, active: true },
  { id: 'pk-4', code: 'PKG-004', partnerId: 'lp-3', name: 'Heart Health Panel', testIds: ['lt-5', 'lt-6', 'lt-7'], priceInr: 1450, active: true },
  { id: 'pk-5', code: 'PKG-005', partnerId: 'lp-3', name: 'Wellness Plus', testIds: ['lt-1', 'lt-3', 'lt-8', 'lt-9'], priceInr: 1800, active: false },
]);

/* --------------------------------- orders ---------------------------------- */

export const LAB_ORDER_STATUSES = [
  'payment_pending', 'payment_successful', 'lab_allocation_pending', 'lab_confirmed', 'collection_scheduled',
  'sample_collected', 'sample_processing', 'report_ready', 'completed', 'cancellation_requested', 'refund_initiated', 'refunded',
] as const;
export type LabOrderStatus = (typeof LAB_ORDER_STATUSES)[number];

export const BOOKING_SOURCES = ['doctor_advised', 'prescription_upload', 'self_selected', 'lab_package'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const COLLECTION_STATUSES = [
  'collection_pending', 'collection_scheduled', 'sample_collected', 'collection_rescheduled', 'collection_failed',
  'recollection_required', 'recollection_scheduled', 'recollection_completed',
] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export type Recollection = {
  reason: string;
  originalDate: string;
  newDate: string;
  newTime: string;
  status: 'required' | 'scheduled' | 'completed';
};

export type LabOrder = {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  orderedAt: string;
  source: BookingSource;
  testIds: string[];
  packageId: string | null;
  address: string;
  pinCode: string;
  window: string;
  partnerId: string | null;
  status: LabOrderStatus;
  collection: CollectionStatus;
  confirmedDate: string | null;
  confirmedTime: string | null;
  sampleCollectedAt: string | null;
  recollection: Recollection | null;
  reportStatus: 'pending' | 'processing' | 'report_ready' | 'completed';
  reportDate: string | null;
  payment: { amountInr: number; status: 'paid' | 'pending' | 'failed' | 'refunded'; txn: string; at: string | null };
  refund: 'none' | 'requested' | 'initiated' | 'completed';
  /** The partners the request was sent to; the first to accept wins (§56). */
  notified: string[];
};

const order = (o: Partial<LabOrder> & Pick<LabOrder, 'id' | 'patientName' | 'testIds' | 'pinCode' | 'status'>): LabOrder => ({
  code: `CLO-${o.id.replace('lo-', '2026-0')}`,
  patientId: 'pt-1001',
  orderedAt: daysAgo(2),
  source: 'self_selected',
  packageId: null,
  address: '12, MG Road',
  window: '08:00-10:00',
  partnerId: null,
  collection: 'collection_pending',
  confirmedDate: null,
  confirmedTime: null,
  sampleCollectedAt: null,
  recollection: null,
  reportStatus: 'pending',
  reportDate: null,
  payment: { amountInr: 0, status: 'paid', txn: `pay_${o.id}`, at: daysAgo(2) },
  refund: 'none',
  notified: [],
  ...o,
});

export const labOrders = createStore<LabOrder>([
  order({ id: 'lo-1', patientId: 'pt-1001', patientName: 'Aarav Mehta', testIds: ['lt-1', 'lt-2'], pinCode: '411045', source: 'doctor_advised', status: 'lab_allocation_pending', orderedAt: hoursAgo(2), payment: { amountInr: 570, status: 'paid', txn: 'pay_Q81xA', at: hoursAgo(2) }, notified: ['lp-1'] }),
  order({ id: 'lo-2', patientId: 'pt-1002', patientName: 'Priya Nair', testIds: ['lt-4', 'lt-9'], packageId: 'pk-3', pinCode: '560034', source: 'lab_package', status: 'collection_scheduled', partnerId: 'lp-2', orderedAt: daysAgo(1), collection: 'collection_scheduled', confirmedDate: inDays(1).slice(0, 10), confirmedTime: '08:30', payment: { amountInr: 1100, status: 'paid', txn: 'pay_Q82bC', at: daysAgo(1) }, notified: ['lp-2'] }),
  order({ id: 'lo-3', patientId: 'pt-1003', patientName: 'Rohan Deshpande', testIds: ['lt-5', 'lt-6', 'lt-7'], packageId: 'pk-4', pinCode: '110017', source: 'prescription_upload', status: 'sample_processing', partnerId: 'lp-3', orderedAt: daysAgo(2), collection: 'sample_collected', confirmedDate: daysAgo(1).slice(0, 10), confirmedTime: '09:00', sampleCollectedAt: daysAgo(1), reportStatus: 'processing', payment: { amountInr: 1450, status: 'paid', txn: 'pay_Q83dE', at: daysAgo(2) }, notified: ['lp-3'] }),
  order({ id: 'lo-4', patientId: 'pt-1004', patientName: 'Sneha Iyer', testIds: ['lt-3'], pinCode: '600042', source: 'self_selected', status: 'payment_pending', orderedAt: hoursAgo(1), payment: { amountInr: 300, status: 'pending', txn: 'pay_Q84fG', at: null } }),
  order({ id: 'lo-5', patientId: 'pt-1005', patientName: 'Kabir Singh', testIds: ['lt-1', 'lt-3', 'lt-8', 'lt-9'], pinCode: '110001', source: 'self_selected', status: 'report_ready', partnerId: 'lp-3', orderedAt: daysAgo(4), collection: 'sample_collected', confirmedDate: daysAgo(3).slice(0, 10), confirmedTime: '07:30', sampleCollectedAt: daysAgo(3), reportStatus: 'report_ready', reportDate: hoursAgo(5), payment: { amountInr: 2100, status: 'paid', txn: 'pay_Q85hI', at: daysAgo(4) }, notified: ['lp-3'] }),
  order({ id: 'lo-6', patientId: 'pt-1006', patientName: 'Ananya Reddy', testIds: ['lt-2', 'lt-1'], packageId: 'pk-1', pinCode: '400050', source: 'doctor_advised', status: 'completed', partnerId: 'lp-1', orderedAt: daysAgo(9), collection: 'sample_collected', confirmedDate: daysAgo(8).slice(0, 10), confirmedTime: '08:00', sampleCollectedAt: daysAgo(8), reportStatus: 'completed', reportDate: daysAgo(6), payment: { amountInr: 850, status: 'paid', txn: 'pay_Q86jK', at: daysAgo(9) }, notified: ['lp-1'] }),
  order({ id: 'lo-7', patientId: 'pt-1007', patientName: 'Vikram Joshi', testIds: ['lt-6'], pinCode: '560001', source: 'self_selected', status: 'sample_collected', partnerId: 'lp-2', orderedAt: daysAgo(1), collection: 'recollection_required', confirmedDate: daysAgo(0).slice(0, 10), confirmedTime: '08:00', sampleCollectedAt: hoursAgo(6), recollection: { reason: 'Sample haemolysed in transit', originalDate: daysAgo(0).slice(0, 10), newDate: inDays(1).slice(0, 10), newTime: '09:00', status: 'required' }, reportStatus: 'pending', payment: { amountInr: 650, status: 'paid', txn: 'pay_Q87lM', at: daysAgo(1) }, notified: ['lp-2'] }),
  order({ id: 'lo-8', patientId: 'pt-1008', patientName: 'Meera Pillai', testIds: ['lt-5'], pinCode: '411001', source: 'self_selected', status: 'refund_initiated', partnerId: null, orderedAt: daysAgo(3), payment: { amountInr: 550, status: 'paid', txn: 'pay_Q88nO', at: daysAgo(3) }, refund: 'initiated', notified: ['lp-1'] }),
]);

/* ------------------------------ allocation rules ---------------------------- */

export type AllocationSettings = {
  id: 'main';
  method: 'first_acceptance';
  pinServiceability: boolean;
  completeBattery: boolean;
  homeCollection: boolean;
  timeoutMinutes: number;
  maxPartnersNotified: number;
};

export const allocationSettings = createStore<AllocationSettings>([
  { id: 'main', method: 'first_acceptance', pinServiceability: true, completeBattery: true, homeCollection: true, timeoutMinutes: 30, maxPartnersNotified: 5 },
]);

/* --------------------------------- helpers --------------------------------- */

export const partnerName = (id: string | null): string =>
  id ? (labPartners.get(id)?.name ?? id) : 'Not allocated';

export const testName = (id: string): string => labTests.get(id)?.name ?? id;

/**
 * Who may be sent a new order (§55): active, serves the PIN, collects at home,
 * and can run every test in the battery. One place, so the order screen and the
 * allocation explanation can never disagree.
 */
export const eligiblePartners = (pinCode: string, testIds: string[]): LabPartner[] =>
  labPartners.all().filter(
    (p) =>
      p.active &&
      p.homeCollection &&
      p.pinCodes.includes(pinCode) &&
      testIds.every((t) => labMappings.all().some((m) => m.partnerId === p.id && m.testId === t)),
  );

/** First acceptance (§56): lock the order to one partner and close the rest. */
export const acceptOrder = (orderId: string, partnerId: string): boolean => {
  const o = labOrders.get(orderId);
  if (!o || o.partnerId) return false; // already locked: duplicate allocation must not occur
  labOrders.patch(orderId, { partnerId, status: 'lab_confirmed', collection: 'collection_pending' });
  return true;
};

export const orderTotalTests = (o: LabOrder): number => o.testIds.length;

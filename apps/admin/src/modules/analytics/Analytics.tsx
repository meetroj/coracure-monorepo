import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { doctors } from '../../mock/db';
import { LIVE } from '../../api/live';
import { analyticsPageLive } from './AnalyticsLive';
import { labOrders, labPackages, labPartners, labTests, partnerName, testName } from '../../mock/ops/lab';
import { useMasterNames } from '../../mock/ops/master';
import { patientPayments, payouts, refunds } from '../../mock/ops/money';
import { patientRecords } from '../../mock/patients';
import type { AdminLevel } from '../../nav';
import { Button, Card, SelectField } from '../../ui';
import { inr } from '../kit/format';
import { Bars, Figure } from '../kit/Stat';
import { useStore } from '../kit/store';
import { CATEGORY_LABEL } from '../providers/provider';

/**
 * Analytics (requirements §71-§77): six pages that share one filter bar - date
 * range, provider category, specialty and service type.
 *
 * ponytail: the figures are derived from the fixture stores and then scaled by
 * the filters. The scaling is a stand-in so the filters visibly do something;
 * the real build passes the four filters to the analytics endpoints and shows
 * what comes back.
 */

type Kind = 'overview' | 'consultations' | 'providers' | 'patients' | 'lab' | 'financial';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 3);

function useScale() {
  const [params, setParams] = useSearchParams();
  const range = params.get('range') ?? '30';
  const category = params.get('category') ?? '';
  const specialty = params.get('specialty') ?? '';
  const service = params.get('service') ?? '';

  const factor =
    (Number(range) / 30) *
    (category ? 0.4 : 1) *
    (specialty ? 0.2 + (hash(specialty) % 20) / 100 : 1) *
    (service === 'lab' || service === 'consultation' ? 0.6 : 1);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const scale = (n: number) => Math.max(0, Math.round(n * factor));
  const filtered = Boolean(category || specialty || service || range !== '30');
  return { range, category, specialty, service, set, scale, filtered, clear: () => setParams({}, { replace: true }) };
}

const pct = (n: number) => `${Math.round(n)}%`;
const count = <T,>(rows: readonly T[], fn: (r: T) => boolean) => rows.filter(fn).length;
const tally = (items: string[]): { label: string; value: number }[] => {
  const m = new Map<string, number>();
  items.forEach((i) => m.set(i, (m.get(i) ?? 0) + 1));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

const fixtureAnalyticsPage = (kind: Kind) =>
  function AnalyticsScreen({ level: _level }: { level: AdminLevel }) {
    return <Analytics kind={kind} />;
  };

/**
 * Live: the backend's own reports. Fixtures: figures derived from the sample
 * stores and scaled by the filters, which is a stand-in and never a count.
 */
export const analyticsPage = (kind: Kind) => (LIVE ? analyticsPageLive(kind) : fixtureAnalyticsPage(kind));

function Analytics({ kind }: { kind: Kind }) {
  const f = useScale();
  const medical = useMasterNames('medical');
  const supers = useMasterNames('super');
  const paramedical = useMasterNames('paramedical');
  const vets = useMasterNames('veterinary');
  const specialties = [...medical, ...supers, ...paramedical, ...vets];
  const orders = useStore(labOrders);
  const pays = useStore(patientPayments);
  const pos = useStore(payouts);
  const refs = useStore(refunds);
  const partners = useStore(labPartners);

  const body = useMemo(() => {
    const s = f.scale;
    const consults = pays.filter((p) => p.service === 'consultation');
    const done = count(consults, (p) => p.status === 'paid');
    const total = consults.length;
    const patients = patientRecords();
    const providers = doctors;

    switch (kind) {
      case 'overview':
        return (
          <div className="stack">
            <Section title="Patients">
              <Figure label="Registered patients" value={patients.length} />
              <Figure label="New in range" value={s(patients.length / 6)} />
            </Section>
            <Section title="Providers">
              <Figure label="Providers" value={providers.length} />
              <Figure label="Active" value={count(providers, (d) => Boolean(d.isListed))} />
            </Section>
            <Section title="Consultations">
              <Figure label="Appointments" value={s(total * 12)} />
              <Figure label="Completed" value={s(done * 12)} />
            </Section>
            <Section title="Lab Services">
              <Figure label="Lab orders" value={s(orders.length * 9)} />
              <Figure label="Reports completed" value={s(count(orders, (o) => o.reportStatus === 'completed' || o.reportStatus === 'report_ready') * 9)} />
            </Section>
            <Section title="Financial activity">
              <Figure label="Gross consultation value" value={inr(s(sum(consults.filter((p) => p.status === 'paid').map((p) => p.amountInr)) * 12))} />
              <Figure label="Diagnostic revenue" value={inr(s(sum(orders.filter((o) => o.payment.status === 'paid').map((o) => o.payment.amountInr)) * 9))} />
            </Section>
          </div>
        );

      case 'consultations': {
        const volume = specialties.slice(0, 8).map((label, i) => ({ label, value: s(40 - i * 4 + (hash(label) % 9)) }));
        const cats = (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((c) => ({
          label: CATEGORY_LABEL[c],
          value: s(count(providers, (d) => (d.category ?? 'doctor') === c) * 30),
        }));
        return (
          <div className="stack">
            <div className="dcards">
              <Figure label="Total appointments" value={s(total * 12)} />
              <Figure label="Completed consultations" value={s(done * 12)} />
              <Figure label="Cancelled consultations" value={s(count(consults, (p) => p.status === 'refunded') * 12 + 6)} />
              <Figure label="Appointment acceptance rate" value={pct(86)} />
              <Figure label="Repeat consultations" value={s(55)} />
              <Figure label="Follow-up completion" value={pct(72)} />
              <Figure label="Average consultation duration" value="31 min" sub="Recorded at start and end" />
              <Figure label="Median consultation duration" value="28 min" />
            </div>
            <Card title="Specialty-wise volume"><Bars rows={volume} /></Card>
            <Card title="Provider-category volume"><Bars rows={cats} /></Card>
          </div>
        );
      }

      case 'providers': {
        const rows = [...providers].sort((a, b) => (b.totalConsultations ?? 0) - (a.totalConsultations ?? 0)).slice(0, 8);
        const rated = providers.filter((d) => d.rating != null);
        return (
          <div className="stack">
            <div className="dcards">
              <Figure label="Appointments offered" value={s(480)} />
              <Figure label="Appointments accepted" value={s(412)} />
              <Figure label="Consultations completed" value={s(388)} />
              <Figure label="Acceptance rate" value={pct(86)} />
              <Figure label="Cancellation rate" value={pct(4)} />
              <Figure label="Average response time" value="6 min" />
              <Figure label="Follow-ups reviewed" value={s(140)} />
              <Figure label="Average rating" value={`${(sum(rated.map((d) => d.rating ?? 0)) / Math.max(rated.length, 1)).toFixed(1)} ★`} />
              <Figure label="Complaints" value={s(9)} />
            </div>
            <Card title="Consultations completed, by provider">
              <Bars rows={rows.map((d) => ({ label: d.fullName, value: s(d.totalConsultations ?? 0) }))} />
            </Card>
          </div>
        );
      }

      case 'patients': {
        const ages = [
          ['Under 25', (a: number) => a < 25], ['25 to 34', (a: number) => a >= 25 && a < 35], ['35 to 44', (a: number) => a >= 35 && a < 45], ['45 and over', (a: number) => a >= 45],
        ] as const;
        return (
          <div className="stack">
            <div className="dcards">
              <Figure label="Total registered patients" value={patients.length} />
              <Figure label="New patients" value={s(patients.length / 6)} />
              <Figure label="Returning patients" value={s(patients.length / 2)} />
              <Figure label="Repeat consultations" value={s(55)} />
            </div>
            <Card title="Age distribution"><Bars rows={ages.map(([label, fn]) => ({ label, value: count(patients, (p) => p.age != null && fn(p.age)) }))} /></Card>
            <Card title="Gender distribution"><Bars rows={tally(patients.map((p) => p.gender))} /></Card>
            <Card title="Location distribution"><Bars rows={tally(patients.map((p) => p.region))} /></Card>
            <Card title="Specialty utilisation"><Bars rows={specialties.slice(0, 8).map((label, i) => ({ label, value: s(30 - i * 3 + (hash(label) % 7)) }))} /></Card>
          </div>
        );
      }

      case 'lab': {
        const tests = tally(orders.flatMap((o) => o.testIds.map(testName))).slice(0, 6).map((r) => ({ ...r, value: s(r.value * 9) }));
        const pkgs = tally(orders.flatMap((o) => (o.packageId ? [labPackages.get(o.packageId)?.name ?? o.packageId] : []))).map((r) => ({ ...r, value: s(r.value * 9) }));
        const byPartner = partners.map((p) => ({ label: p.name, value: s(count(orders, (o) => o.partnerId === p.id) * 9) }));
        const byPin = tally(orders.map((o) => o.pinCode)).map((r) => ({ label: `PIN ${r.label}`, value: s(r.value * 9) }));
        const collected = count(orders, (o) => o.sampleCollectedAt !== null);
        const recollect = count(orders, (o) => o.recollection !== null);
        return (
          <div className="stack">
            <Section title="Orders">
              <Figure label="Total lab orders" value={s(orders.length * 9)} />
              <Figure label="Completed orders" value={s(count(orders, (o) => o.status === 'completed') * 9)} />
              <Figure label="Cancelled orders" value={s(count(orders, (o) => o.status === 'cancellation_requested') * 9)} />
              <Figure label="Refunded orders" value={s(count(orders, (o) => o.refund !== 'none') * 9)} />
            </Section>
            <Section title="Tests & packages">
              <Figure label="Individual tests ordered" value={s(sum(orders.map((o) => (o.packageId ? 0 : o.testIds.length))) * 9)} />
              <Figure label="Packages ordered" value={s(count(orders, (o) => o.packageId !== null) * 9)} />
            </Section>
            <Card title="Most frequently booked tests"><Bars rows={tests} /></Card>
            <Card title="Most frequently booked packages"><Bars rows={pkgs.length ? pkgs : [{ label: 'None yet', value: 0 }]} /></Card>
            <Card title="Partner-wise order volume"><Bars rows={byPartner} /></Card>
            <Card title="Orders by PIN code / location"><Bars rows={byPin} /></Card>
            <Section title="Partners, collection and reports">
              <Figure label="Partner acceptance rate" value={pct(78)} />
              <Figure label="Collection completion rate" value={pct((collected / Math.max(orders.length, 1)) * 100)} />
              <Figure label="Recollection rate" value={pct((recollect / Math.max(collected, 1)) * 100)} />
              <Figure label="Reports completed" value={s(count(orders, (o) => o.reportStatus === 'completed') * 9)} />
              <Figure label="Average report turnaround" value="26 h" />
            </Section>
            <p className="muted small">{labTests.all().length} tests and {partners.length} partners in the master. Partner names: {partners.map((p) => partnerName(p.id)).join(', ')}.</p>
          </div>
        );
      }

      case 'financial': {
        const paid = pays.filter((p) => p.status === 'paid');
        const gross = sum(paid.filter((p) => p.service === 'consultation').map((p) => p.amountInr));
        const diagnostic = sum(paid.filter((p) => p.service === 'lab').map((p) => p.amountInr));
        const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((label, i) => ({ label, value: s(gross * (6 + i * 1.6) + diagnostic * (4 + i)) }));
        return (
          <div className="stack">
            <div className="dcards">
              <Figure label="Gross consultation value" value={inr(s(gross * 12))} />
              <Figure label="Platform commission" value={inr(s(sum(pos.map((p) => p.commissionInr)) * 12))} />
              <Figure label="Patient platform fee" value={inr(s(count(paid, (p) => p.service === 'consultation') * 49 * 12))} />
              <Figure label="Provider payouts" value={inr(s(sum(pos.map((p) => p.netInr)) * 12))} />
              <Figure label="Diagnostic revenue" value={inr(s(diagnostic * 9))} />
              <Figure label="Refunds" value={inr(s(sum(refs.filter((r) => r.status === 'completed').map((r) => r.amountInr)) * 4))} />
              <Figure label="Payment failures" value={s(count(pays, (p) => p.status === 'failed') * 6)} />
            </div>
            <Card title="Monthly revenue trend (₹)"><Bars rows={months} /></Card>
          </div>
        );
      }
    }
  }, [kind, f.range, f.category, f.specialty, f.service, orders, pays, pos, refs, partners, specialties.join('|')]);

  return (
    <>
      <div className="filterBar">
        <SelectField label="Date range" options={RANGES} value={f.range} onChange={(e) => f.set('range', e.target.value)} />
        <SelectField
          label="Provider category"
          options={[{ value: '', label: 'All categories' }, ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))]}
          value={f.category}
          onChange={(e) => f.set('category', e.target.value)}
        />
        <SelectField
          label="Specialty"
          options={[{ value: '', label: 'All specialties' }, ...specialties.map((n) => ({ value: n, label: n }))]}
          value={f.specialty}
          onChange={(e) => f.set('specialty', e.target.value)}
        />
        <SelectField
          label="Service type"
          options={[{ value: '', label: 'All services' }, { value: 'consultation', label: 'Consultation' }, { value: 'lab', label: 'Lab' }]}
          value={f.service}
          onChange={(e) => f.set('service', e.target.value)}
        />
        {f.filtered && (
          <Button variant="ghost" icon="close" onClick={f.clear}>
            Reset
          </Button>
        )}
      </div>
      {body}
    </>
  );
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="dsection">{title}</h2>
      <div className="dcards">{children}</div>
    </section>
  );
}

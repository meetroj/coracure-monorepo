import { appointments, appointmentById } from './doctor';
import { patients, patientById } from './patients';
import { patientAlerts } from './followup';
import { threads, notifications, type AppNotification } from './messaging';
import { clarifications } from './clarification';
import { patientDocs } from './documents';

/**
 * The demo data is walked through in front of a client, so every link in it
 * must land on the same patient it names: an alert, thread, document or
 * notification for patient A never opens patient B.
 */

const patientOfAppointment = (id: string | undefined) => {
  const a = appointmentById(id);
  expect(a).toBeDefined();
  return a!.patientId;
};

test('one name per patient, and every appointment agrees with its patient', () => {
  const names = Object.values(patients).map((p) => p.name);
  expect(new Set(names).size).toBe(names.length);
  appointments.forEach((a) => {
    const p = patientById(a.patientId);
    expect(p).toBeDefined();
    expect([a.name, a.age, a.gender]).toEqual([p!.name, p!.age, p!.gender]);
  });
});

test('every follow-up alert belongs to the patient of its consultation', () => {
  expect(patientAlerts.length).toBeGreaterThan(0);
  patientAlerts.forEach((al) => expect([al.id, patientOfAppointment(al.appointmentId)]).toEqual([al.id, al.patientId]));
});

test('every patient chat thread is that patient’s, under their own name', () => {
  const own = threads.filter((t) => t.patientId);
  expect(own.length).toBeGreaterThan(0);
  own.forEach((t) => {
    expect(patientById(t.patientId)?.name).toBe(t.name);
    if (t.appointmentId) expect([t.id, patientOfAppointment(t.appointmentId)]).toEqual([t.id, t.patientId]);
  });
});

test('every clarification describes the patient of its consultation', () => {
  expect(clarifications.length).toBeGreaterThan(0);
  clarifications.forEach((c) => {
    const a = appointmentById(c.appointmentId);
    expect(a).toBeDefined();
    expect([c.id, c.shared.gender]).toEqual([c.id, a!.gender]);
    // "28 years" names the age; "25–34" is a band that must contain it
    const [lo, hi] = (c.shared.ageLabel.match(/\d+/g) ?? []).map(Number);
    if (hi === undefined) expect([c.id, lo]).toEqual([c.id, a!.age]);
    else expect(a!.age >= lo && a!.age <= hi).toBe(true);
  });
});

test('every document belongs to a known patient, and to the patient of its consultation', () => {
  expect(patientDocs.length).toBeGreaterThan(0);
  patientDocs.forEach((d) => {
    expect(patientById(d.patientId)).toBeDefined();
    if (d.appointmentId) expect([d.id, patientOfAppointment(d.appointmentId)]).toEqual([d.id, d.patientId]);
  });
});

const targetPatient = (n: AppNotification): string | undefined => {
  const t = n.target;
  switch (t.route) {
    case 'document': {
      const doc = patientDocs.find((d) => d.id === t.docId);
      expect([n.id, doc?.patientId]).toEqual([n.id, t.patientId]);
      return t.patientId;
    }
    case 'alertDetail': {
      const al = patientAlerts.find((x) => x.id === t.alertId);
      expect([n.id, !!al]).toEqual([n.id, true]);
      return al?.patientId;
    }
    case 'apptDetails':
      return patientOfAppointment(t.appointmentId);
    case 'expertResponse': {
      const c = clarifications.find((x) => x.id === t.clarificationId);
      expect([n.id, !!c]).toEqual([n.id, true]);
      return c ? patientOfAppointment(c.appointmentId) : undefined;
    }
    default:
      return undefined;
  }
};

test('every notification opens a record that exists — and the patient it names', () => {
  let named = 0;
  notifications.forEach((n) => {
    const target = targetPatient(n);
    const text = `${n.title} ${n.body}`;
    Object.values(patients)
      .filter((p) => text.includes(p.name))
      .forEach((p) => {
        named++;
        expect([n.id, target]).toEqual([n.id, p.id]);
      });
  });
  // the check above must have had something to check
  expect(named).toBeGreaterThan(0);
});

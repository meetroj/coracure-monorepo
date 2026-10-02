import * as db from './db';
import { extraConsultations } from './moreConsultations';
import type {
  CheckInColour,
  PatientConsent,
  PatientConsultation,
  PatientDetailRecord,
  PatientProfile,
  PatientStatus,
} from '../api/patients';

/**
 * Patient fixtures. Built once, lazily (so `db` is fully initialised first).
 *
 * The first three patients are wired to the REAL consultations and complaints
 * in `db`, so those rows open working detail screens; the rest carry
 * synthetic ids. No clinical content exists here by design.
 */

/** A birth date that makes `age` true today: an early-year day, so it has already passed. */
const dobFor = (age: number, i: number) =>
  `${new Date().getFullYear() - age}-0${1 + (i % 9)}-${String(10 + ((i * 7) % 18))}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// [name, gender, age, language, region, status]
const PEOPLE: [string, string, number, string, string, PatientStatus][] = [
  ['Aarav Mehta', 'Male', 34, 'Hindi', 'Delhi NCR', 'active'],
  ['Priya Nair', 'Female', 29, 'English', 'Karnataka', 'active'],
  ['Rohan Deshpande', 'Male', 41, 'Marathi', 'Maharashtra', 'active'],
  ['Sneha Iyer', 'Female', 26, 'Tamil', 'Tamil Nadu', 'active'],
  ['Kabir Singh', 'Male', 38, 'Hindi', 'Delhi NCR', 'inactive'],
  ['Ananya Reddy', 'Female', 31, 'Telugu', 'Karnataka', 'active'],
  ['Vikram Joshi', 'Male', 52, 'Marathi', 'Maharashtra', 'active'],
  ['Meera Pillai', 'Female', 45, 'Malayalam', 'Karnataka', 'pending_deletion'],
  ['Arjun Kapoor', 'Male', 23, 'English', 'Delhi NCR', 'active'],
  ['Divya Menon', 'Female', 36, 'Malayalam', 'Tamil Nadu', 'active'],
  ['Siddharth Rao', 'Male', 47, 'Kannada', 'Karnataka', 'inactive'],
  ['Kavya Sharma', 'Female', 28, 'Hindi', 'Delhi NCR', 'active'],
  ['Harsh Patel', 'Male', 33, 'Gujarati', 'Maharashtra', 'active'],
  ['Lakshmi Subramanian', 'Female', 58, 'Tamil', 'Tamil Nadu', 'active'],
  ['Nikhil Verma', 'Male', 30, 'Hindi', 'Delhi NCR', 'inactive'],
  ['Isha Kulkarni', 'Female', 24, 'Marathi', 'Maharashtra', 'active'],
  ['Rahul Bansal', 'Male', 44, 'Hindi', 'Delhi NCR', 'active'],
  ['Pooja Hegde', 'Female', 35, 'Kannada', 'Karnataka', 'active'],
  ['Aditya Chauhan', 'Male', 27, 'Hindi', 'Delhi NCR', 'pending_deletion'],
  ['Tanvi Bhatt', 'Female', 32, 'Gujarati', 'Maharashtra', 'active'],
  ['Manoj Kumar', 'Male', 55, 'Tamil', 'Tamil Nadu', 'active'],
  ['Shruti Gokhale', 'Female', 39, 'Marathi', 'Maharashtra', 'inactive'],
  ['Deepak Nambiar', 'Male', 49, 'Malayalam', 'Tamil Nadu', 'active'],
  ['Riya Malhotra', 'Female', 22, 'English', 'Delhi NCR', 'active'],
  ['Sanjay Gowda', 'Male', 61, 'Kannada', 'Karnataka', 'active'],
  ['Neha Agarwal', 'Female', 37, 'Hindi', 'Delhi NCR', 'active'],
  ['Karthik Raman', 'Male', 42, 'Tamil', 'Tamil Nadu', 'active'],
  ['Aishwarya Jadhav', 'Female', 30, 'Marathi', 'Maharashtra', 'inactive'],
];

const PLACES: Record<string, { city: string; district: string; state: string; pin: number }> = {
  'Delhi NCR': { city: 'New Delhi', district: 'South Delhi', state: 'Delhi', pin: 110017 },
  Karnataka: { city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pin: 560034 },
  Maharashtra: { city: 'Pune', district: 'Pune', state: 'Maharashtra', pin: 411045 },
  'Tamil Nadu': { city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pin: 600042 },
};
const BLOOD = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-'];
const ALLERGIES = ['Penicillin', 'Dust and pollen', 'None known', 'Peanuts'];
const CONDITIONS = ['Hypertension', 'Type 2 diabetes', 'None', 'Asthma'];
const MEDS = ['Amlodipine 5 mg', 'Metformin 500 mg', 'None', 'Salbutamol inhaler'];

/** Deterministic fixture. Every third patient has not filled the optional health profile. */
const profileFor = (i: number, fullName: string, language: string, region: string): PatientProfile => {
  const place = PLACES[region] ?? PLACES['Delhi NCR'];
  const first = fullName.split(' ')[0].toLowerCase();
  return {
    email: `${first}.${i + 1}@example.com`,
    languages: i % 2 === 0 ? [language, 'English'] : [language],
    photoUploaded: i % 3 !== 1,
    addressLine1: `${12 + i * 3}, ${['MG Road', 'Park Street', 'Lake View Apartments', 'Station Road'][i % 4]}`,
    addressLine2: i % 2 === 0 ? `Flat ${100 + i}` : null,
    city: place.city,
    district: i % 3 === 0 ? null : place.district,
    state: place.state,
    pinCode: String(place.pin + (i % 7)),
    country: 'India',
    health:
      i % 3 === 2
        ? null
        : {
            bloodGroup: BLOOD[i % BLOOD.length],
            heightCm: 150 + ((i * 7) % 35),
            weightKg: 52 + ((i * 5) % 38),
            allergies: ALLERGIES[i % ALLERGIES.length],
            chronicConditions: CONDITIONS[i % CONDITIONS.length],
            regularMedications: MEDS[i % MEDS.length],
          },
  };
};

const SERVICES = ['Psychiatry', 'Psychology', 'Therapy', 'De-addiction'];
const DOCTORS = ['Dr Ananya Rao', 'Dr Vikram Sethi', 'Meera Krishnan', 'Dr Farah Khan'];
const CONSULT_STATUS = ['completed', 'completed', 'completed', 'cancelled', 'scheduled', 'no_show'];
const CHECKINS: CheckInColour[] = ['green', 'green', 'amber', 'red'];
const FILE_CATS = ['Lab report', 'ID proof', 'Prior records', 'Insurance'];

const build = (): PatientDetailRecord[] =>
  PEOPLE.map(([fullName, gender, age, language, region, status], i) => {
    const id = `pt-${1001 + i}`;
    const n = i + 1;
    // Inactive patients have been quiet for months; the rest are spread over weeks.
    const quiet = status === 'inactive' ? 120 + i * 3 : 0;

    const consultations: PatientConsultation[] = [];
    // The first three reuse the real fixtures.
    const real = ['cs-1003', 'cs-1001', 'cs-1002'][i];
    const realRow = real ? db.consultations.find((c) => c.id === real) : undefined;
    if (realRow) {
      consultations.push({
        id: realRow.id,
        referenceCode: realRow.referenceCode ?? realRow.id,
        status: realRow.status,
        serviceName: realRow.serviceName ?? 'Consultation',
        doctorName: realRow.doctorName ?? null,
        startsAt: realRow.startsAt ?? realRow.createdAt ?? daysAgo(2),
      });
    }
    const extra = (i * 7) % 5; // 0-4 more, so some patients have none
    for (let k = 0; k < extra; k++) {
      // Real rows from the Consultations list, so every link opens a detail.
      const row = extraConsultations[(i * 5 + k) % extraConsultations.length];
      consultations.push({
        id: row.id,
        referenceCode: row.referenceCode ?? row.id,
        status: row.status,
        serviceName: row.serviceName ?? SERVICES[(i + k) % SERVICES.length],
        doctorName: row.doctorName ?? null,
        startsAt: row.startsAt ?? daysAgo(quiet + 6 + i * 2 + k * 19),
      });
    }

    // Complaints: the first three use the real ones; a few others get a synthetic one.
    const complaints: PatientDetailRecord['complaints'] = [];
    const realComplaint = db.complaints[i];
    if (realComplaint) {
      complaints.push({
        id: realComplaint.id,
        subject: realComplaint.subject ?? 'Complaint',
        category: realComplaint.category,
        status: realComplaint.status,
        raisedAt: realComplaint.raisedAt ?? daysAgo(3),
      });
    } else if (i % 6 === 4) {
      complaints.push({
        id: `cp-2${n}`,
        subject: 'Refund still pending',
        category: 'payment_issue',
        status: i % 12 === 4 ? 'open' : 'resolved',
        raisedAt: daysAgo(quiet + 9),
      });
    }

    const followUps: PatientDetailRecord['followUps'] = [];
    if (i % 3 !== 2 && consultations.length > 0) {
      const active = status === 'active' && i % 2 === 0;
      followUps.push({
        id: `fu-${n}a`,
        consultationId: consultations[0].id,
        consultationRef: consultations[0].referenceCode,
        planName: i % 4 === 0 ? 'Weekly wellbeing check-in' : '30-day medication adherence',
        status: active ? 'active' : 'completed',
        startedAt: daysAgo(quiet + 21),
        endsAt: active ? null : daysAgo(quiet + 2),
        checkIn: CHECKINS[i % CHECKINS.length],
        lastCheckInAt: daysAgo(quiet + (i % 5)),
      });
      if (i % 5 === 0)
        followUps.push({
          id: `fu-${n}b`,
          consultationId: consultations[Math.min(1, consultations.length - 1)].id,
          consultationRef: consultations[Math.min(1, consultations.length - 1)].referenceCode,
          planName: 'Post-session sleep tracking',
          status: 'stopped',
          startedAt: daysAgo(quiet + 90),
          endsAt: daysAgo(quiet + 60),
          checkIn: null,
          lastCheckInAt: null,
        });
    }

    const files = Array.from({ length: i % 4 }, (_, k) => ({
      id: `fl-${n}-${k}`,
      name: ['blood-test.pdf', 'aadhaar-front.jpg', 'discharge-summary.pdf'][k % 3],
      category: FILE_CATS[(i + k) % FILE_CATS.length],
      uploadedAt: daysAgo(quiet + 4 + k * 11),
    }));

    const reportRequests: PatientDetailRecord['reportRequests'] =
      i % 3 === 0
        ? [
            {
              id: `rr-${n}`,
              title: 'Thyroid profile',
              status: i % 2 === 0 ? 'requested' : 'received',
              requestedAt: daysAgo(quiet + 5),
            },
          ]
        : [];

    const joinedAt = daysAgo(quiet + 150 + i * 9);
    const consents: PatientConsent[] = [
      { documentType: 'Terms of service', version: 'v2.1', acceptedAt: joinedAt },
      { documentType: 'Privacy policy', version: 'v1.4', acceptedAt: joinedAt },
      { documentType: 'Telehealth consent', version: 'v1.0', acceptedAt: joinedAt },
    ];
    if (i % 4 !== 3)
      consents.push({
        documentType: 'Data sharing with provider',
        version: 'v1.1',
        acceptedAt: daysAgo(quiet + 30),
      });

    return {
      id,
      referenceCode: `PT-2026-${String(n).padStart(4, '0')}`,
      fullName,
      // Fake numbers only.
      mobileNumber: `+91 9${String(81000000 + i * 79193).padStart(9, '0')}`,
      dateOfBirth: dobFor(age, i),
      age,
      gender,
      language,
      region,
      status,
      joinedAt,
      lastActiveAt: daysAgo(quiet + ((i * 5) % 28) + (i === 0 ? 0 : 1)),
      // The three below are derived by `api/patients.ts`.
      consultationCount: consultations.length,
      lastConsultationAt: null,
      hasOpenComplaint: false,
      hasActiveFollowUp: false,
      profile: profileFor(i, fullName, language, region),
      consultations,
      complaints,
      followUps,
      files,
      reportRequests,
      consents,
    };
  });

let cache: PatientDetailRecord[] | null = null;
export const patientRecords = (): PatientDetailRecord[] => (cache ??= build());

/**
 * The patient a case belongs to: the one whose record lists it, otherwise a stable stand-in (the
 * fixtures do not tie every listed case to a patient, so a link must still open a record).
 */
export const ownerOf = (consultationId: string): PatientDetailRecord => {
  const people = patientRecords();
  return (
    people.find((p) => p.consultations.some((c) => c.id === consultationId)) ??
    people[[...consultationId].reduce((n, ch) => n + ch.charCodeAt(0), 0) % people.length]
  );
};

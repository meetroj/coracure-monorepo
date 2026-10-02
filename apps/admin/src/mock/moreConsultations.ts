import type { Consultation, ConsultationStatus } from '../api/types';

/**
 * Extra consultation fixtures for the browsable list.
 *
 * `db.consultations` holds only three rows — too few to exercise filters or
 * paging — so the list merges these in. They are plain read-only rows;
 * `api/admin.ts` `consultations.get` also looks here so every listed row opens.
 * Patients are shown as initials only: the admin sees logistics, not identity.
 */

export type ListedConsultation = Consultation & {
  patientName: string;
  channel: 'video' | 'audio';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
};

const h = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

const SERVICES: Record<string, string> = {
  'sp-psy': 'Psychiatry',
  'sp-psyc': 'Psychology',
  'sp-ther': 'Therapy',
  'sp-coun': 'Counselling',
  'sp-deadd': 'De-addiction',
};

const DOCTORS: Record<string, string> = {
  'dr-1': 'Dr Ananya Rao',
  'dr-2': 'Dr Vikram Sethi',
  'dr-3': 'Meera Krishnan',
  'dr-4': 'Dr Sameer Joshi',
  'dr-5': 'Rhea Dutta',
  'dr-6': 'Dr Kabir Nair',
};

type Pay = ListedConsultation['paymentStatus'];
type Mode = 'scheduled' | 'instant';
type Chan = ListedConsultation['channel'];

// [status, mode, channel, hours from now, service, doctor, language, patient, payment]
const SEED: [ConsultationStatus, Mode, Chan, number, string, string, string, string, Pay][] = [
  ['scheduled', 'scheduled', 'video', 3, 'sp-psy', 'dr-1', 'Hindi', 'R.K.', 'paid'],
  ['scheduled', 'scheduled', 'audio', 26, 'sp-psyc', 'dr-3', 'English', 'S.M.', 'paid'],
  ['scheduled', 'scheduled', 'video', 52, 'sp-ther', 'dr-4', 'Tamil', 'A.P.', 'paid'],
  ['scheduled', 'scheduled', 'video', 98, 'sp-coun', 'dr-5', 'English', 'N.V.', 'paid'],
  ['scheduled', 'scheduled', 'audio', 160, 'sp-deadd', 'dr-2', 'Hindi', 'T.B.', 'paid'],
  ['scheduled', 'scheduled', 'video', 300, 'sp-psy', 'dr-6', 'Hindi', 'M.D.', 'paid'],
  ['pending_payment', 'scheduled', 'video', 20, 'sp-psyc', 'dr-3', 'English', 'K.S.', 'pending'],
  ['pending_payment', 'scheduled', 'audio', 70, 'sp-coun', 'dr-5', 'Hindi', 'J.G.', 'pending'],
  ['awaiting_doctor', 'instant', 'video', 0, 'sp-psy', 'dr-1', 'Hindi', 'P.N.', 'paid'],
  ['awaiting_doctor', 'instant', 'audio', -0.2, 'sp-deadd', 'dr-2', 'Hindi', 'L.C.', 'paid'],
  ['in_progress', 'instant', 'video', -0.4, 'sp-psyc', 'dr-3', 'English', 'V.R.', 'paid'],
  ['in_progress', 'scheduled', 'video', -0.3, 'sp-ther', 'dr-4', 'English', 'H.A.', 'paid'],
  ['awaiting_documentation', 'scheduled', 'video', -54, 'sp-psy', 'dr-2', 'Hindi', 'D.S.', 'paid'],
  ['awaiting_documentation', 'instant', 'audio', -80, 'sp-deadd', 'dr-6', 'Hindi', 'G.M.', 'paid'],
  ['completed', 'scheduled', 'video', -28, 'sp-psy', 'dr-1', 'Hindi', 'B.T.', 'paid'],
  ['completed', 'scheduled', 'audio', -52, 'sp-coun', 'dr-5', 'English', 'F.I.', 'paid'],
  ['completed', 'instant', 'video', -76, 'sp-psyc', 'dr-3', 'Tamil', 'C.W.', 'paid'],
  ['completed', 'scheduled', 'video', -100, 'sp-ther', 'dr-4', 'English', 'O.L.', 'paid'],
  ['completed', 'scheduled', 'audio', -124, 'sp-deadd', 'dr-2', 'Hindi', 'Y.E.', 'paid'],
  ['completed', 'instant', 'video', -150, 'sp-psy', 'dr-6', 'Hindi', 'U.H.', 'paid'],
  ['completed', 'scheduled', 'video', -220, 'sp-psy', 'dr-1', 'Hindi', 'Q.A.', 'paid'],
  ['completed', 'scheduled', 'video', -400, 'sp-coun', 'dr-5', 'English', 'Z.K.', 'paid'],
  ['cancelled', 'scheduled', 'video', -30, 'sp-psyc', 'dr-3', 'English', 'W.R.', 'refunded'],
  ['cancelled', 'scheduled', 'audio', 44, 'sp-ther', 'dr-4', 'Tamil', 'E.D.', 'refunded'],
  ['cancelled', 'scheduled', 'video', -170, 'sp-psy', 'dr-1', 'Hindi', 'I.J.', 'paid'],
  ['no_show', 'scheduled', 'video', -46, 'sp-deadd', 'dr-6', 'Hindi', 'X.N.', 'paid'],
  ['no_show', 'scheduled', 'audio', -120, 'sp-psy', 'dr-2', 'Hindi', 'A.G.', 'paid'],
  ['expired', 'scheduled', 'video', -26, 'sp-psyc', 'dr-3', 'English', 'M.P.', 'failed'],
  ['expired', 'scheduled', 'audio', -90, 'sp-coun', 'dr-5', 'English', 'R.O.', 'failed'],
  ['expired', 'instant', 'video', -200, 'sp-psy', 'dr-1', 'Hindi', 'S.U.', 'pending'],
];

export const extraConsultations: ListedConsultation[] = SEED.map(
  ([status, mode, channel, hours, svc, doc, language, patientName, paymentStatus], i) => ({
    id: `cs-${1100 + i}`,
    referenceCode: `CC-2026-0${1100 + i}`,
    status,
    mode,
    channel,
    startsAt: h(hours),
    serviceId: svc,
    serviceName: SERVICES[svc],
    doctorId: doc,
    doctorName: DOCTORS[doc],
    language,
    regionId: 'rg-mh',
    createdAt: h(hours - 24),
    patientName,
    paymentStatus,
  }),
);

/** Patient / channel / payment for the three rows that live in `db.ts`. */
export const baseExtras: Record<string, Pick<ListedConsultation, 'patientName' | 'channel' | 'paymentStatus'>> = {
  'cs-1001': { patientName: 'N.B.', channel: 'video', paymentStatus: 'paid' },
  'cs-1002': { patientName: 'K.R.', channel: 'audio', paymentStatus: 'pending' },
  'cs-1003': { patientName: 'V.T.', channel: 'video', paymentStatus: 'paid' },
};

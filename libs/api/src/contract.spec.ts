import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Every response type in this client, checked field by field against the
 * backend's own return interface.
 *
 * *** THE ONLY TEST HERE THAT CAN CATCH DRIFT NOBODY IN THIS REPO CAUSED. ***
 * Every other spec mocks `fetch`, so it asserts what we BELIEVE the server
 * sends. If a backend field is renamed, every one of them stays green and the
 * app breaks on a device. This reads the backend source and fails the moment
 * the two disagree.
 *
 * It is a source comparison, not a running-server check, so it still cannot
 * see serialisation (a `Date` crossing JSON, a `Decimal` arriving as a string)
 * or a status code. Those need one pass against a live server. What it does
 * cover is the mistake that is easiest to make and hardest to notice: reading
 * the contract wrong, or reading it right and then having it change.
 *
 * Skips itself when the backend is not checked out beside the frontend, so a
 * CI job for this repo alone stays green.
 */

const BACKEND = join(__dirname, '../../../apps/backend/coracure_backend/src');
const CLIENT = join(__dirname, 'endpoints');

const read = (file: string) => readFileSync(file, 'utf8').split('\r').join('');
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The body of the first `{ … }` after `header`, brace-matched. */
const blockAfter = (src: string, header: string): string | null => {
  const at = src.indexOf(header);
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  return null;
};

/** Top-level keys only — a nested object's fields belong to that object. */
const fieldsIn = (body: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s{2}(\w+)\??:/);
    if (depth === 0 && m) out.push(m[1]!);
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
  }
  return out.sort();
};

/** Backend interfaces compose, so `extends` has to be followed. */
const backendFields = (file: string, name: string, seen = new Set<string>()): string[] | null => {
  const src = strip(read(join(BACKEND, file)));
  const body = blockAfter(src, `export interface ${name} `);
  if (!body) return null;
  let fields = fieldsIn(body);
  const parent = src.match(new RegExp(`export interface ${name} extends ([A-Za-z0-9_]+)`));
  if (parent && !seen.has(parent[1]!)) {
    seen.add(parent[1]!);
    const inherited = backendFields(file, parent[1]!, seen);
    if (inherited) fields = [...new Set([...fields, ...inherited])].sort();
  }
  return fields;
};

const clientFields = (file: string, name: string): string[] | null => {
  const body = blockAfter(strip(read(join(CLIENT, file))), `export type ${name} = `);
  return body && fieldsIn(body);
};

/** client type ⇄ the backend interface it is a copy of. */
const SHAPES: [string, string, string, string][] = [
  ['DoctorConsultation', 'doctorConsultations.ts', 'booking/booking.service.ts', 'ConsultationRecord'],
  ['PatientCard', 'doctorConsultations.ts', 'patients/patient-profile.service.ts', 'PatientCard'],
  ['PendingDocumentation', 'doctorConsultations.ts', 'clinical/clinical-records.service.ts', 'PendingDocumentation'],
  ['SafetyAlert', 'doctorConsultations.ts', 'followup/safety-alerts.service.ts', 'AlertRecord'],
  ['PresenceRecord', 'doctorPresence.ts', 'instant/presence.service.ts', 'PresenceRecord'],
  ['InstantOffer', 'doctorPresence.ts', 'instant/instant-routing.service.ts', 'OfferRecord'],
  ['Diary', 'doctorAvailability.ts', 'scheduling/availability.service.ts', 'DiaryRecord'],
  ['AvailabilityRule', 'doctorAvailability.ts', 'scheduling/availability.service.ts', 'AvailabilityRuleRecord'],
  ['VerificationProgress', 'doctorProfile.ts', 'doctors/doctor-verification.service.ts', 'VerificationProgress'],
  ['CredentialSummary', 'doctorProfile.ts', 'doctors/doctor-verification.service.ts', 'CredentialSummary'],
  ['DoctorSelfProfile', 'doctorProfile.ts', 'doctors/doctor-registry.service.ts', 'DoctorSelfProfile'],
  ['RegistrationView', 'doctorProfile.ts', 'doctors/doctor-registration.service.ts', 'RegistrationView'],
  ['PatientFile', 'doctorFiles.ts', 'files/patient-files.service.ts', 'PatientFileRecord'],
  ['ReportRequest', 'doctorFiles.ts', 'files/report-requests.service.ts', 'ReportRequestRecord'],
];

const backendPresent = existsSync(BACKEND);

(backendPresent ? describe : describe.skip)('client types match the backend', () => {
  it.each(SHAPES)('%s has the same fields as %s › %s › %s', (clientName, clientFile, backendFile, backendName) => {
    const mine = clientFields(clientFile, clientName);
    const theirs = backendFields(backendFile, backendName);

    // A shape that cannot be parsed is a failure, not a pass: silently
    // skipping is how this test would rot into decoration.
    expect(mine).not.toBeNull();
    expect(theirs).not.toBeNull();
    expect(mine).toEqual(theirs);
  });
});

(backendPresent ? describe.skip : describe)('backend not checked out', () => {
  it('skips the contract check rather than failing the build', () => {
    expect(backendPresent).toBe(false);
  });
});

/**
 * The doctor's assigned patients.
 *
 * Every other record — appointment, alert, document, thread — points here by
 * `patientId`, so a screen resolves one patient and never mixes two.
 */

export type Patient = {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: 'Male' | 'Female';
};

const p = (id: string, name: string, age: number, gender: Patient['gender']): Patient => ({
  id,
  name,
  initials: name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
  age,
  gender,
});

const list: Patient[] = [
  p('PT-10482', 'Rahul Sharma', 32, 'Male'),
  p('PT-10459', 'Anita Patel', 34, 'Female'),
  p('PT-10460', 'Sandeep Kumar', 40, 'Male'),
  p('PT-10461', 'Neha Pillai', 28, 'Female'),
  p('PT-10462', 'Aditya Kapoor', 38, 'Male'),
  p('PT-10548', 'Priya Singh', 35, 'Female'),
  p('PT-10470', 'Meera Verma', 36, 'Female'),
  p('PT-10471', 'Rohit Desai', 49, 'Male'),
  p('PT-10472', 'Kavita Nair', 57, 'Female'),
  p('PT-10463', 'Meera Joshi', 31, 'Female'),
  p('PT-10464', 'Kabir Shah', 29, 'Male'),
  p('PT-10465', 'Sameer Khan', 44, 'Male'),
  p('PT-10466', 'Divya Nair', 26, 'Female'),
  p('PT-10467', 'Neha Singh', 27, 'Female'),
  p('PT-10468', 'Rohit Verma', 45, 'Male'),
  p('PT-10469', 'Priya Menon', 38, 'Female'),
  p('PT-10473', 'Imran Qureshi', 42, 'Male'),
  p('PT-10474', 'Ananya Rao', 24, 'Female'),
  p('PT-10475', 'Vikram Desai', 51, 'Male'),
  p('PT-10476', 'Riya Kapoor', 30, 'Female'),
  p('PT-10477', 'Farhan Sheikh', 33, 'Male'),
  p('PT-10478', 'Lakshmi Iyer', 60, 'Female'),
  // the instant-consultation requester; not yet an assigned patient
  p('PT-10480', 'Karan Malhotra', 29, 'Male'),
];

export const patients: Record<string, Patient> = Object.fromEntries(list.map((x) => [x.id, x]));

export const patientById = (id: string | undefined): Patient | undefined =>
  id ? patients[id] : undefined;

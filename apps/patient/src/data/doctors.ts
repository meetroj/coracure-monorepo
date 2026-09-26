import DrArjunImg from '../assets/dr-arjun-mehta.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import type { IconName } from '@coracure/ui';

/**
 * The doctor catalogue behind the booking flow.
 *
 * Stands in for `GET /providers` until it is wired. Every screen in the flow
 * (list, profile, slot, instant request) reads from here so a doctor's fee,
 * photo and next slot cannot disagree between two screens.
 */
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  regNo: string;
  years: number;
  languages: string[];
  /** Consultation fee in rupees. */
  fee: number;
  durationMins: number;
  rating: number;
  reviews: string;
  satisfaction: number;
  /** How well the doctor matches the chosen service, as the mocks show it. */
  matchPercent: number;
  matchFor: string;
  availableNow: boolean;
  nextAvailable: string;
  about: string;
  focus: { label: string; icon: IconName }[];
  /** Five days of upcoming availability, as the profile screen lists them. */
  upcoming: { day: string; date: string; times: string[] }[];
  img: number;
  /** Services this doctor answers for, matched against the service screen. */
  services: string[];
};

export const DOCTORS: Doctor[] = [
  {
    id: 'doc-arjun',
    name: 'Dr. Arjun Mehta',
    specialty: 'General Physician',
    qualification: 'MBBS, MD (Internal Medicine)',
    regNo: 'MCI 123456',
    years: 10,
    languages: ['English', 'Hindi'],
    fee: 350,
    durationMins: 15,
    rating: 4.9,
    reviews: '1.2K reviews',
    satisfaction: 98,
    matchPercent: 98,
    matchFor: 'Cold, Cough, Fever',
    availableNow: true,
    nextAvailable: 'Today, 11:30 AM',
    about:
      'Dr. Arjun Mehta is a dedicated physician with over a decade of experience in internal medicine. He focuses on accurate diagnosis, preventive care, and evidence-based treatment to help patients achieve long-term wellness.',
    focus: [
      { label: 'Fever & Infections', icon: 'shield' },
      { label: 'Cold & Cough', icon: 'heart' },
      { label: 'Diabetes Care', icon: 'clipboard' },
      { label: 'Hypertension', icon: 'stethoscope' },
    ],
    upcoming: [
      { day: 'Today', date: '16 May', times: ['10:30 AM', '08:00 PM'] },
      { day: 'Fri', date: '17 May', times: ['11:00 AM', '07:00 PM'] },
      { day: 'Sat', date: '18 May', times: ['09:30 AM', '06:30 PM'] },
      { day: 'Sun', date: '19 May', times: ['10:00 AM', '05:00 PM'] },
      { day: 'Mon', date: '20 May', times: ['11:30 AM', '07:30 PM'] },
    ],
    img: DrArjunImg,
    services: ['General Physician', 'Specialist', 'Follow-up Care'],
  },
  {
    id: 'doc-neha',
    name: 'Dr. Neha Sharma',
    specialty: 'Pulmonologist',
    qualification: 'MBBS, DNB (Respiratory Medicine)',
    regNo: 'MCI 67890',
    years: 10,
    languages: ['English', 'Hindi', 'Tamil'],
    fee: 600,
    durationMins: 20,
    rating: 4.8,
    reviews: '860 reviews',
    satisfaction: 95,
    matchPercent: 95,
    matchFor: 'Cough, Low-Grade Fever',
    availableNow: false,
    nextAvailable: 'Today, 01:00 PM',
    about:
      'Dr. Neha Sharma treats airway and breathing conditions, from long-standing cough to asthma. She works with patients on a plan they can keep to, and reviews it with them as it takes effect.',
    focus: [
      { label: 'Asthma', icon: 'heart' },
      { label: 'Chronic Cough', icon: 'stethoscope' },
      { label: 'Breathlessness', icon: 'shield' },
      { label: 'Sleep Apnoea', icon: 'clipboard' },
    ],
    upcoming: [
      { day: 'Today', date: '16 May', times: ['01:00 PM', '06:00 PM'] },
      { day: 'Fri', date: '17 May', times: ['09:00 AM', '04:30 PM'] },
      { day: 'Sat', date: '18 May', times: ['10:30 AM', '05:30 PM'] },
      { day: 'Sun', date: '19 May', times: ['11:00 AM', '03:00 PM'] },
      { day: 'Mon', date: '20 May', times: ['09:30 AM', '06:00 PM'] },
    ],
    img: DrNehaImg,
    services: ['Pulmonology', 'Super Specialist', 'Sleep & Stress'],
  },
  {
    id: 'doc-richard',
    name: 'Dr. Richard Parker',
    specialty: 'Orthopedic Surgeon',
    qualification: 'MBBS, MS (Orthopaedics)',
    regNo: 'MCI 24680',
    years: 15,
    languages: ['English', 'Hindi'],
    fee: 600,
    durationMins: 30,
    rating: 4.8,
    reviews: '256 reviews',
    satisfaction: 93,
    matchPercent: 93,
    matchFor: 'Knee Pain, Joint Stiffness',
    availableNow: false,
    nextAvailable: 'Today, 04:00 PM',
    about:
      'Dr. Richard Parker has fifteen years in joint and sports injury care, with a focus on getting patients back to ordinary movement. He treats surgery as the last option, not the first.',
    focus: [
      { label: 'Knee & Joint Pain', icon: 'heart' },
      { label: 'Sports Injury', icon: 'shield' },
      { label: 'Post-Op Recovery', icon: 'clipboard' },
      { label: 'Physiotherapy', icon: 'stethoscope' },
    ],
    upcoming: [
      { day: 'Today', date: '16 May', times: ['04:00 PM', '07:00 PM'] },
      { day: 'Fri', date: '17 May', times: ['10:00 AM', '05:00 PM'] },
      { day: 'Sat', date: '18 May', times: ['09:00 AM', '01:00 PM'] },
      { day: 'Sun', date: '19 May', times: ['11:30 AM', '04:30 PM'] },
      { day: 'Mon', date: '20 May', times: ['10:30 AM', '06:30 PM'] },
    ],
    img: DrRichardImg,
    services: ['Orthopedics', 'Super Specialist', 'Follow-up Care'],
  },
];

export const findDoctor = (id?: string) =>
  DOCTORS.find((d) => d.id === id) ?? DOCTORS[0];

/** The service catalogue the "Choose a Service" screen lists. */
export type Service = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
};

export const SERVICES: Service[] = [
  { id: 'general', name: 'General Physician', description: 'Everyday illness, fever and infections', icon: 'stethoscope' },
  { id: 'orthopedics', name: 'Orthopedics', description: 'Bone, joint and movement problems', icon: 'heart' },
  { id: 'pulmonology', name: 'Pulmonology', description: 'Breathing, cough and chest conditions', icon: 'shield' },
  { id: 'mental-health', name: 'Psychologist / Therapy', description: 'Talk therapy and emotional well-being support', icon: 'message' },
  { id: 'sleep-stress', name: 'Sleep & Stress', description: 'Better sleep and stress management', icon: 'clock' },
  { id: 'follow-up', name: 'Follow-up Care', description: 'Ongoing support and progress tracking', icon: 'clipboard' },
];

/**
 * Help & Support — FAQs and the doctor's own raised issues.
 *
 * Issues are the doctor's own support tickets, not clinical cases — they
 * never carry patient data, only what the doctor reported about the app.
 */
import { dayOffset, fmtDate } from './calendar';

export type Faq = {
  id: string;
  question: string;
  answer: string;
  topic: 'Consultations' | 'Account' | 'Payments' | 'Records';
};

export const faqs: Faq[] = [
  {
    id: 'f1',
    topic: 'Consultations',
    question: 'How do I join a video consultation?',
    answer: 'Open the appointment from Dashboard or Appointments and tap "Join Consultation" once it unlocks, a few minutes before the scheduled time.',
  },
  {
    id: 'f2',
    topic: 'Consultations',
    question: 'How do I reschedule an appointment?',
    answer: 'Rescheduling is coordinated by the CoraCure care team. Raise an issue from Help & Support with the appointment ID and they will agree a new time with the patient.',
  },
  {
    id: 'f3',
    topic: 'Records',
    question: 'How do I add or update patient notes?',
    answer: 'From an appointment or the consultation room, open "Clinical Notes & Diagnosis". Notes are saved as a draft while you type and stay editable until the case summary is submitted.',
  },
  {
    id: 'f4',
    topic: 'Payments',
    question: 'Where can I view my earnings?',
    answer: 'Go to Profile > Earnings and payouts for consultation totals, payout status and the full payout history.',
  },
  {
    id: 'f5',
    topic: 'Account',
    question: 'How do I sign in?',
    answer: 'Sign in with your registered mobile number. A one-time code is sent by SMS each time, so there is no password to remember or reset.',
  },
  {
    id: 'f6',
    topic: 'Account',
    question: 'How do I change a verified profile detail?',
    answer: 'Verified details such as your registration number or qualifications are changed by an administrator. Use Profile > Request changes and describe what should change.',
  },
  {
    id: 'f7',
    topic: 'Payments',
    question: 'When are payouts made?',
    answer: 'Payouts are processed manually on the 5th of each month for the previous month\'s completed consultations.',
  },
  {
    id: 'f8',
    topic: 'Records',
    question: 'Who can see a clarification I share with an expert?',
    answer: 'Only the expert reviewer. The case is de-identified before it is shared, and the discussion is never shown to the patient or added to their record.',
  },
];

export type IssueState = 'open' | 'inReview' | 'resolved';

export const ISSUE_STATE_LABEL: Record<IssueState, string> = {
  open: 'Open',
  inReview: 'In Review',
  resolved: 'Resolved',
};

export type SupportIcon = 'video' | 'wallet' | 'shieldCheck' | 'message';

export const ISSUE_CATEGORIES: { key: string; label: string; icon: SupportIcon }[] = [
  { key: 'consultation', label: 'Consultation or video call', icon: 'video' },
  { key: 'payment', label: 'Payments and payouts', icon: 'wallet' },
  { key: 'account', label: 'Account and verification', icon: 'shieldCheck' },
  { key: 'other', label: 'Something else', icon: 'message' },
];

export type SupportIssue = {
  id: string;
  ref: string;
  title: string;
  category: string;
  description: string;
  dateLabel: string;
  state: IssueState;
  icon: SupportIcon;
  updates: { at: string; body: string }[];
};

export const supportIssues: SupportIssue[] = [
  {
    id: 'si1',
    ref: 'ISS-78421',
    title: 'Unable to join video consultation',
    category: 'consultation',
    description: 'The Join button stayed disabled for a confirmed appointment until I reopened the app.',
    dateLabel: fmtDate(dayOffset(0)),
    state: 'open',
    icon: 'video',
    updates: [{ at: fmtDate(dayOffset(0)), body: 'We have received your request and will reply within 24 hours.' }],
  },
  {
    id: 'si2',
    ref: 'ISS-77988',
    title: 'Payment not reflected',
    category: 'payment',
    description: 'A completed consultation from last week is missing from my earnings.',
    dateLabel: fmtDate(dayOffset(-3)),
    state: 'inReview',
    icon: 'wallet',
    updates: [
      { at: fmtDate(dayOffset(-3)), body: 'We have received your request and will reply within 24 hours.' },
      { at: fmtDate(dayOffset(-2)), body: 'The finance team is reconciling last week\'s consultations.' },
    ],
  },
  {
    id: 'si3',
    ref: 'ISS-77543',
    title: 'Profile verification pending',
    category: 'account',
    description: 'My registration certificate was uploaded two days ago but still shows under review.',
    dateLabel: fmtDate(dayOffset(-5)),
    state: 'resolved',
    icon: 'shieldCheck',
    updates: [
      { at: fmtDate(dayOffset(-5)), body: 'We have received your request and will reply within 24 hours.' },
      { at: fmtDate(dayOffset(-4)), body: 'Your registration was verified and your profile is now active.' },
    ],
  },
];

export const supportContact = {
  email: 'support@coracure.com',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
};

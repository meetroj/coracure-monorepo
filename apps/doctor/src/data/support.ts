/**
 * Help & Support — FAQs and the doctor's own raised issues.
 *
 * Issues are the doctor's own support tickets, not clinical cases — they
 * never carry patient data, only what the doctor reported about the app.
 */

export type Faq = {
  id: string;
  question: string;
  answer: string;
};

export const faqs: Faq[] = [
  {
    id: 'f1',
    question: 'How do I join a video consultation?',
    answer: 'Open the appointment from Dashboard or Appointments and tap "Join Consultation" once it unlocks, a few minutes before the scheduled time.',
  },
  {
    id: 'f2',
    question: 'How do I reschedule an appointment?',
    answer: 'Open the appointment\'s details and use "More options" to request a reschedule. The patient is notified and must confirm the new time.',
  },
  {
    id: 'f3',
    question: 'How do I add or update patient notes?',
    answer: 'From an appointment, open "Clinical Notes & Diagnosis" during or after the consultation. Notes autosave as you type.',
  },
  {
    id: 'f4',
    question: 'Where can I view my earnings?',
    answer: 'Go to Profile > Earnings and payouts for consultation totals, payout status and history for any period.',
  },
  {
    id: 'f5',
    question: 'How do I reset my password?',
    answer: 'From the login screen, tap "Forgot password" and follow the steps sent to your registered email.',
  },
];

export type IssueState = 'open' | 'inReview' | 'resolved';

export const ISSUE_STATE_LABEL: Record<IssueState, string> = {
  open: 'Open',
  inReview: 'In Review',
  resolved: 'Resolved',
};

export type SupportIcon = 'video' | 'wallet' | 'shieldCheck';

export type SupportIssue = {
  id: string;
  ref: string;
  title: string;
  dateLabel: string;
  state: IssueState;
  icon: SupportIcon;
};

export const supportIssues: SupportIssue[] = [
  { id: 'si1', ref: 'ISS-78421', title: 'Unable to join video consultation', dateLabel: '15 May 2024', state: 'open', icon: 'video' },
  { id: 'si2', ref: 'ISS-77988', title: 'Payment not reflected', dateLabel: '12 May 2024', state: 'inReview', icon: 'wallet' },
  { id: 'si3', ref: 'ISS-77543', title: 'Profile verification pending', dateLabel: '10 May 2024', state: 'resolved', icon: 'shieldCheck' },
];

export const supportContact = {
  email: 'support@coracure.com',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
};

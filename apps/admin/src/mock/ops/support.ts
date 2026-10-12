import { createStore, daysAgo, hoursAgo } from '../../modules/kit/store';

/** Support Tickets and Feedback (requirements §82-§85). */

export const TICKET_STATUSES = ['new', 'open', 'in_progress', 'awaiting_user_response', 'resolved', 'closed'] as const;
export const TICKET_CATEGORIES = ['patient', 'provider', 'lab', 'payment', 'technical', 'other'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type Ticket = {
  id: string;
  code: string;
  subject: string;
  body: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: string;
  raisedByType: 'Patient' | 'Provider' | 'Lab partner';
  patientId: string | null;
  assignee: string | null;
  createdAt: string;
  notes: { by: string; text: string; at: string }[];
};

const t = (
  n: number,
  subject: string,
  body: string,
  category: TicketCategory,
  priority: TicketPriority,
  status: TicketStatus,
  raisedBy: string,
  raisedByType: Ticket['raisedByType'],
  patientId: string | null,
  assignee: string | null,
  hours: number,
): Ticket => ({
  id: `tk-${n}`,
  code: `TKT-${1000 + n}`,
  subject,
  body,
  category,
  priority,
  status,
  raisedBy,
  raisedByType,
  patientId,
  assignee,
  createdAt: hoursAgo(hours),
  notes: [],
});

export const tickets = createStore<Ticket>([
  t(1, 'Payment deducted but appointment not confirmed', 'Money left my account at 9 pm but the app still shows pending.', 'payment', 'urgent', 'new', 'Aarav Mehta', 'Patient', 'pt-1001', null, 3),
  t(2, 'Cannot upload registration certificate', 'The upload spins and fails for files above 2 MB.', 'technical', 'high', 'open', 'Dr Tara Sen', 'Provider', null, 'Support Admin', 10),
  t(3, 'Lab collection agent did not arrive', 'Slot was 8 to 10 am. Nobody came and nobody called.', 'lab', 'high', 'in_progress', 'Priya Nair', 'Patient', 'pt-1002', 'Support Admin', 26),
  t(4, 'Want to change my registered mobile number', 'I lost the old SIM. How do I update it?', 'patient', 'medium', 'awaiting_user_response', 'Sneha Iyer', 'Patient', 'pt-1004', 'Support Admin', 50),
  t(5, 'Payout for last month not received', 'Settlement date has passed by 4 days.', 'payment', 'high', 'open', 'Dr Ananya Rao', 'Provider', null, null, 40),
  t(6, 'Report PDF opens blank', 'The Lab report downloaded from the app shows a white page.', 'lab', 'medium', 'resolved', 'Kabir Singh', 'Patient', 'pt-1005', 'Support Admin', 120),
  t(7, 'Partner portal is not showing new requests', 'Sunrise Diagnostics sees no new orders since morning.', 'lab', 'urgent', 'new', 'Sunrise Diagnostics', 'Lab partner', null, null, 1),
  t(8, 'Feature suggestion: dark mode on provider app', 'Long evening sessions are hard on the eyes.', 'other', 'low', 'closed', 'Dr Sameer Joshi', 'Provider', null, 'Support Admin', 300),
  t(9, 'Video keeps freezing', 'Third time this week, on mobile data.', 'technical', 'medium', 'in_progress', 'Rohan Deshpande', 'Patient', 'pt-1003', 'Support Admin', 70),
  t(10, 'Need an invoice for my records', 'Please send a GST invoice for the last consultation.', 'payment', 'low', 'open', 'Ananya Reddy', 'Patient', 'pt-1006', null, 90),
]);

/* --------------------------------- feedback -------------------------------- */

export const FEEDBACK_TYPES = ['patient', 'provider', 'lab_service', 'app'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  from: string;
  about: string;
  rating: number;
  comment: string;
  at: string;
};

export const feedbackItems = createStore<FeedbackItem>([
  { id: 'fb-1', type: 'patient', from: 'Aarav Mehta', about: 'Dr Ananya Rao', rating: 5, comment: 'Patient and clear. Explained the plan without jargon.', at: daysAgo(1) },
  { id: 'fb-2', type: 'patient', from: 'Sneha Iyer', about: 'Meera Krishnan', rating: 4, comment: 'Helpful session, started ten minutes late.', at: daysAgo(3) },
  { id: 'fb-3', type: 'provider', from: 'Dr Vikram Sethi', about: 'Provider app', rating: 3, comment: 'Case summary screen needs fewer taps.', at: daysAgo(4) },
  { id: 'fb-4', type: 'lab_service', from: 'Kabir Singh', about: 'Metro Path Labs', rating: 5, comment: 'Agent arrived on time, report in 20 hours.', at: daysAgo(2) },
  { id: 'fb-5', type: 'lab_service', from: 'Vikram Joshi', about: 'CityCare Labs', rating: 2, comment: 'Sample had to be collected again.', at: daysAgo(1) },
  { id: 'fb-6', type: 'app', from: 'Priya Nair', about: 'Patient app', rating: 4, comment: 'Booking is easy. Would like a reminder an hour before.', at: daysAgo(6) },
  { id: 'fb-7', type: 'app', from: 'Rohan Deshpande', about: 'Patient app', rating: 3, comment: 'Slow to load on older phones.', at: daysAgo(8) },
  { id: 'fb-8', type: 'provider', from: 'Dr Neha Kulkarni', about: 'Verification process', rating: 5, comment: 'Clear checklist, quick turnaround.', at: daysAgo(12) },
]);

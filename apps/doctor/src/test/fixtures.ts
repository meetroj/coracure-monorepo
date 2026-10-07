import type { DoctorFeedback } from '@coracure/api';

import { messagesByThread, threads } from '../data/messaging';
import { clarifications } from '../data/clarification';
import { supportIssues } from '../data/support';
import type { AppState } from '../state/store';

/**
 * What `GET /v1/doctor/feedback` answers for a doctor with twelve ratings, of
 * which the three newest are listed. The figures deliberately do NOT follow
 * from the three entries: the server computes them over every rating, and a
 * screen that averaged the list instead would show 4.0 here, not 4.6.
 */
export const sampleFeedback: DoctorFeedback = {
  averageRating: 4.6,
  ratingCount: 12,
  distribution: [
    { stars: 5, count: 9 },
    { stars: 4, count: 2 },
    { stars: 3, count: 0 },
    { stars: 2, count: 1 },
    { stars: 1, count: 0 },
  ],
  entries: [
    {
      consultationId: 'c-101',
      referenceCode: 'CC-4K2M-7QX9',
      rating: 5,
      comment: 'Listened patiently and explained the plan clearly.',
      consultedAt: '2026-05-12T09:00:00.000Z',
      channel: 'video',
      patientInitials: 'AS',
    },
    {
      consultationId: 'c-102',
      referenceCode: 'CC-8T1P-2LW4',
      rating: 5,
      comment: null,
      consultedAt: '2026-05-10T11:30:00.000Z',
      channel: 'audio',
      patientInitials: null,
    },
    {
      consultationId: 'c-103',
      referenceCode: 'CC-3N9D-6HV2',
      rating: 2,
      comment: 'The call started late.',
      consultedAt: null,
      channel: 'video',
      patientInitials: 'RK',
    },
  ],
};

/**
 * The sample conversations, clarification cases and support tickets the app
 * no longer ships with — a real doctor must never see invented patients or
 * tickets. Specs seed them here (test-setup and `signedIn`); a spec that
 * wants the empty state sets the slice back to [].
 */
export const demoFixtures = (): Pick<AppState, 'threads' | 'clarifications' | 'supportIssues'> => ({
  threads: threads.map((t) => ({ ...t, messages: [...(messagesByThread[t.id] ?? [])] })),
  clarifications: clarifications.map((c) => ({ ...c, messages: [...c.messages] })),
  supportIssues: supportIssues.map((i) => ({ ...i, updates: [...i.updates] })),
});

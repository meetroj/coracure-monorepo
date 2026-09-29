import type { IconName } from '@coracure/ui';

/**
 * The Care Hub catalogue the doctor picks from on their side
 * (`apps/doctor/src/app/screens/CareHubScreen.tsx` + `data/followup.ts`).
 * Only published + clinically reviewed material ever reaches the patient, so
 * this mirror carries just those rows — the doctor cannot recommend anything
 * else.
 *
 * ponytail: mirrored by hand and the picks are mocked; replace both with the
 * consultation's `careRecommendations` payload once the endpoint lands.
 */

export type ResourceKind = 'tool' | 'education';

export interface CareResource {
  id: string;
  title: string;
  blurb: string;
  /** Mapped from the doctor app's icon set to the icons this app ships. */
  icon: IconName;
  kind: ResourceKind;
  meta: string;
}

export const careResources: CareResource[] = [
  { id: 'r1', title: 'Guided Breathing', blurb: 'Calm your mind with simple breathing exercises.', icon: 'heart', kind: 'tool', meta: '5-minute exercise' },
  { id: 'r3', title: 'Sleep Hygiene', blurb: 'Build healthy sleep habits for better rest and recovery.', icon: 'clock', kind: 'tool', meta: 'Routine guide' },
  { id: 'r7', title: 'Managing Anxiety', blurb: 'Evidence-based techniques to manage stress and worry.', icon: 'sparkles', kind: 'tool', meta: 'Technique guide' },
  { id: 'r6', title: 'Family Support', blurb: 'Strengthen support systems and improve communication.', icon: 'inPerson', kind: 'tool', meta: 'Guide' },
  { id: 'r2', title: 'Grounding Technique', blurb: 'Step-by-step distress management you can use anywhere.', icon: 'shieldCheck', kind: 'tool', meta: 'Exercise' },
  { id: 'r5', title: 'Medication Adherence', blurb: 'Practical routines for taking medication on time.', icon: 'prescription', kind: 'tool', meta: 'Routine guide' },
  { id: 'r10', title: 'Mood Tracking', blurb: 'Notice patterns in mood from day to day.', icon: 'star', kind: 'tool', meta: 'Daily log' },

  { id: 'm1', title: 'Understanding Anxiety', blurb: 'What anxiety is, why it happens and what helps.', icon: 'sparkles', kind: 'education', meta: '8-minute read' },
  { id: 'm2', title: 'Understanding Depression', blurb: 'Recognising low mood and what recovery looks like.', icon: 'heart', kind: 'education', meta: '7-minute read' },
  { id: 'm3', title: 'Sleep and Recovery', blurb: 'How rest affects mood, focus and healing.', icon: 'clock', kind: 'education', meta: '5-minute read' },
];

/** What the doctor saved on the advice step of the write-up. */
export const doctorRecommendation = {
  doctorName: 'Dr. Richard Parker',
  resourceIds: ['r1', 'r3', 'm1', 'm3'],
  note: 'Start with the breathing exercise twice a day and read the sleep module before your follow-up.',
};

export const recommendedResources = doctorRecommendation.resourceIds
  .map((id) => careResources.find((r) => r.id === id))
  .filter((r): r is CareResource => Boolean(r));

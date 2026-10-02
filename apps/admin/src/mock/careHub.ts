import { ApiError } from '@coracure/api/errors';

/**
 * In-memory Care Hub store (UI-ONLY build). Field names follow the backend's
 * `ContentItem` model: itemType, slug (unique), title <=200, summary <=400, body
 * as JSON blocks, concern/specialty, cover, isVerifiedOrg, reviewStatus, sortOrder.
 * Cover images are kept as data URLs; nothing is uploaded anywhere.
 */

export const ITEM_TYPES = [
  { value: 'self_help_tool', label: 'Self-help tool' },
  { value: 'education_module', label: 'Education module' },
  { value: 'blog_article', label: 'Blog article' },
  { value: 'caregiver_guide', label: 'Caregiver guide' },
  { value: 'emergency_guidance', label: 'Emergency guidance' },
  { value: 'support_org', label: 'Support organisation' },
  { value: 'clinical_reference', label: 'Clinical reference' },
] as const;

export type CareHubType = (typeof ITEM_TYPES)[number]['value'];
export type CareHubStatus = 'draft' | 'in_review' | 'published' | 'archived';

export const typeLabel = (t: string) => ITEM_TYPES.find((i) => i.value === t)?.label ?? t;

export const CONCERNS = [
  'Anxiety',
  'Depression',
  'Sleep',
  'Stress',
  'Addiction',
  'Grief',
  'Relationships',
  'Crisis',
] as const;

export const SPECIALTIES = [
  'Psychiatry',
  'Clinical psychology',
  'Counselling',
  'De-addiction',
] as const;

export type BodyBlock =
  | { type: 'heading' | 'paragraph'; text: string }
  | { type: 'bullets' | 'key_points'; items: string[] };

export type CareHubItem = {
  id: string;
  type: CareHubType;
  title: string;
  slug: string;
  summary: string;
  concern: string;
  specialty: string;
  /** Data URL (or any image URL). Empty = none. */
  coverUrl: string;
  /** What the admin pasted; `videoId` is derived from it. */
  videoUrl: string;
  videoId: string;
  body: BodyBlock[];
  /** support_org only. */
  helplines: string[];
  website: string;
  verifiedOrg: boolean;
  sortOrder: number;
  status: CareHubStatus;
  updatedAt: string;
};

export type CareHubInput = Omit<CareHubItem, 'id' | 'status' | 'updatedAt'>;

export const emptyInput = (): CareHubInput => ({
  type: 'blog_article',
  title: '',
  slug: '',
  summary: '',
  concern: '',
  specialty: '',
  coverUrl: '',
  videoUrl: '',
  videoId: '',
  body: [],
  helplines: [],
  website: '',
  verifiedOrg: false,
  sortOrder: 0,
});

/* ---------------------------------- seeds --------------------------------- */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** A small generated SVG cover, so thumbnails really render with no assets. */
const cover = (label: string, hue: number): string => {
  const safe = label.replace(/[<>&"]/g, '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,38%)"/>` +
    `</linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>` +
    `<circle cx="540" cy="70" r="90" fill="#fff" fill-opacity=".14"/>` +
    `<circle cx="90" cy="320" r="120" fill="#fff" fill-opacity=".1"/>` +
    `<text x="40" y="320" font-family="sans-serif" font-size="30" font-weight="700" fill="#fff">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

type Seed = Partial<CareHubItem> & Pick<CareHubItem, 'id' | 'type' | 'title' | 'status'>;

const seed = (s: Seed): CareHubItem => ({
  ...emptyInput(),
  slug: s.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  updatedAt: daysAgo(3),
  ...s,
});

// Well-known public videos, standing in for real content.
const yt = (id: string) => ({ videoId: id, videoUrl: `https://www.youtube.com/watch?v=${id}` });

const para = (text: string): BodyBlock => ({ type: 'paragraph', text });

let items: CareHubItem[] = [
  seed({
    id: 'ch-1',
    type: 'self_help_tool',
    title: 'Building a sleep routine',
    status: 'published',
    summary: 'A gentle, step-by-step wind-down routine to help you fall asleep and stay asleep.',
    concern: 'Sleep',
    coverUrl: cover('Sleep routine', 230),
    sortOrder: 1,
    updatedAt: daysAgo(30),
    body: [
      { type: 'heading', text: 'Why routine matters' },
      para('Your body clock likes predictability. Going to bed and waking at similar times helps.'),
      { type: 'key_points', items: ['Keep a fixed wake time', 'Dim lights an hour before bed', 'Avoid screens in bed'] },
    ],
  }),
  seed({
    id: 'ch-2',
    type: 'self_help_tool',
    title: 'Grounding techniques for panic',
    status: 'in_review',
    summary: 'The 5-4-3-2-1 method and two other quick exercises to steady yourself during a panic attack.',
    concern: 'Anxiety',
    coverUrl: cover('Grounding', 170),
    ...yt('5qap5aO4i9A'),
    sortOrder: 2,
    updatedAt: daysAgo(2),
    body: [para('Name five things you can see, four you can touch, three you can hear.')],
  }),
  seed({
    id: 'ch-3',
    type: 'caregiver_guide',
    title: 'Supporting a family member in recovery',
    status: 'draft',
    summary: 'How to be present without taking over: boundaries, patience and looking after yourself.',
    concern: 'Addiction',
    sortOrder: 3,
    updatedAt: daysAgo(0),
    body: [{ type: 'bullets', items: ['Listen before advising', 'Celebrate small steps', 'Look after your own rest'] }],
  }),
  seed({
    id: 'ch-4',
    type: 'support_org',
    title: 'NGO and helpline directory',
    status: 'published',
    summary: 'Verified organisations offering free listening and referral services.',
    concern: 'Crisis',
    coverUrl: cover('Helplines', 20),
    helplines: ['+91 22 2754 6669', '1800 599 0019'],
    website: 'https://www.example.org/help',
    verifiedOrg: true,
    sortOrder: 4,
    updatedAt: daysAgo(90),
    body: [para('Lines are staffed by trained volunteers. Call any time you need to talk.')],
  }),
  seed({
    id: 'ch-5',
    type: 'education_module',
    title: 'Understanding depression',
    status: 'published',
    summary: 'What depression is, how it differs from sadness, and what treatment can look like.',
    concern: 'Depression',
    coverUrl: cover('Depression', 260),
    ...yt('jNQXAC9IVRw'),
    sortOrder: 5,
    updatedAt: daysAgo(12),
    body: [
      { type: 'heading', text: 'More than a low mood' },
      para('Depression affects sleep, energy, appetite and how we think about ourselves.'),
      { type: 'key_points', items: ['It is common and treatable', 'Talking to a clinician is a strong first step'] },
    ],
  }),
  seed({
    id: 'ch-6',
    type: 'blog_article',
    title: 'Five small habits that ease everyday stress',
    status: 'published',
    summary: 'No big life changes needed: five habits you can start today, in under ten minutes each.',
    concern: 'Stress',
    coverUrl: cover('Everyday stress', 40),
    sortOrder: 6,
    updatedAt: daysAgo(8),
    body: [{ type: 'bullets', items: ['Walk for ten minutes', 'Write three things that went well', 'Stretch before bed'] }],
  }),
  seed({
    id: 'ch-7',
    type: 'emergency_guidance',
    title: 'If you are thinking about harming yourself',
    status: 'published',
    summary: 'Immediate steps and numbers to call right now. You are not alone.',
    concern: 'Crisis',
    coverUrl: cover('Get help now', 350),
    sortOrder: 0,
    updatedAt: daysAgo(20),
    body: [
      { type: 'key_points', items: ['Call a local emergency number', 'Stay with someone you trust', 'Remove anything you could use to hurt yourself'] },
    ],
  }),
  seed({
    id: 'ch-8',
    type: 'clinical_reference',
    title: 'Brief screening tools overview',
    status: 'in_review',
    summary: 'PHQ-9 and GAD-7 at a glance: scoring bands, when to escalate and what they cannot tell you.',
    specialty: 'Clinical psychology',
    sortOrder: 8,
    updatedAt: daysAgo(1),
    body: [para('Screening supports, but never replaces, a clinical assessment.')],
  }),
  seed({
    id: 'ch-9',
    type: 'self_help_tool',
    title: 'Box breathing in four minutes',
    status: 'draft',
    summary: 'A guided breathing pattern you can do anywhere to bring your heart rate down.',
    concern: 'Anxiety',
    ...yt('aqz-KE-bpKQ'),
    sortOrder: 9,
    updatedAt: daysAgo(0),
    body: [{ type: 'bullets', items: ['Inhale for four', 'Hold for four', 'Exhale for four', 'Hold for four'] }],
  }),
  seed({
    id: 'ch-10',
    type: 'education_module',
    title: 'Grief is not a straight line',
    status: 'draft',
    summary: 'Why grief comes in waves, and ways to carry it while life carries on.',
    concern: 'Grief',
    coverUrl: cover('Grief', 200),
    sortOrder: 10,
    updatedAt: daysAgo(4),
    body: [para('There is no correct timetable for loss.')],
  }),
  seed({
    id: 'ch-11',
    type: 'blog_article',
    title: 'Talking to your partner about stress',
    status: 'published',
    summary: 'Conversation starters that keep things kind and constructive when both of you are tired.',
    concern: 'Relationships',
    ...yt('9bZkp7q19f0'),
    sortOrder: 11,
    updatedAt: daysAgo(15),
    body: [para('Pick a calm moment, and start with how you feel rather than what they did.')],
  }),
  seed({
    id: 'ch-12',
    type: 'support_org',
    title: 'Community de-addiction centres',
    status: 'draft',
    summary: 'Local centres offering counselling and supervised recovery programmes.',
    concern: 'Addiction',
    coverUrl: cover('Recovery centres', 130),
    helplines: ['1800 11 0031'],
    website: 'https://www.example.org/centres',
    verifiedOrg: false,
    sortOrder: 12,
    updatedAt: daysAgo(6),
    body: [para('Listings are being verified before they are shown to patients.')],
  }),
  seed({
    id: 'ch-13',
    type: 'blog_article',
    title: 'Mindful mornings (retired)',
    status: 'archived',
    summary: 'An older piece on morning mindfulness, replaced by the sleep and stress series.',
    concern: 'Stress',
    coverUrl: cover('Mindful mornings', 90),
    ...yt('kJQP7kiw5Fk'),
    sortOrder: 13,
    updatedAt: daysAgo(140),
    body: [para('Archived content is hidden from patients.')],
  }),
];

/* ---------------------------------- logic --------------------------------- */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const fail = (statusCode: number, code: string, message: string) =>
  new ApiError({ statusCode, code, message });

export const list = (): CareHubItem[] => clone(items);

export const get = (id: string): CareHubItem => {
  const found = items.find((i) => i.id === id);
  if (!found) throw fail(404, 'NOT_FOUND', 'Item not found');
  return clone(found);
};

/** Drops blank lines and empty blocks, so what is stored is what patients see. */
export const cleanBody = (body: BodyBlock[]): BodyBlock[] =>
  body.flatMap((b): BodyBlock[] => {
    if ('text' in b)
      return b.text.trim() ? [{ type: b.type, text: b.text.trim() }] : [];
    const lines = b.items.map((l) => l.trim()).filter(Boolean);
    return lines.length ? [{ type: b.type, items: lines }] : [];
  });

let sequence = 100;

export function save(input: CareHubInput, id?: string): CareHubItem {
  if (!input.title.trim()) throw fail(400, 'VALIDATION_FAILED', 'Title is required.');
  // The backend's `slug` is unique.
  if (items.some((i) => i.slug === input.slug && i.id !== id))
    throw fail(409, 'CONFLICT', 'That slug is already used by another item.');

  const clean: CareHubInput = {
    ...input,
    title: input.title.trim(),
    body: cleanBody(input.body),
    helplines: input.helplines.map((h) => h.trim()).filter(Boolean),
    // Support-org fields do not travel with any other type.
    ...(input.type === 'support_org' ? {} : { helplines: [], website: '', verifiedOrg: false }),
  };
  const now = new Date().toISOString();

  if (!id) {
    const created: CareHubItem = { ...clean, id: `ch-${++sequence}`, status: 'draft', updatedAt: now };
    items = [created, ...items];
    return clone(created);
  }

  const index = items.findIndex((i) => i.id === id);
  if (index < 0) throw fail(404, 'NOT_FOUND', 'Item not found');
  const current = items[index];
  // A sign-off applies to the words that were reviewed. Editing in-review or
  // published content sends it back to draft, so it cannot go live unreviewed.
  const status: CareHubStatus =
    current.status === 'in_review' || current.status === 'published' ? 'draft' : current.status;
  const next: CareHubItem = { ...clean, id, status, updatedAt: now };
  items = items.map((i, n) => (n === index ? next : i));
  return clone(next);
}

const ALLOWED: Record<CareHubStatus, CareHubStatus[]> = {
  draft: ['in_review'],
  in_review: ['published'],
  published: ['archived'],
  archived: [],
};

/** draft -> in_review -> published -> archived. Nothing skips a step. */
export function transition(id: string, to: CareHubStatus): CareHubItem {
  const found = items.find((i) => i.id === id);
  if (!found) throw fail(404, 'NOT_FOUND', 'Item not found');
  if (!ALLOWED[found.status].includes(to))
    throw fail(
      409,
      'CONFLICT',
      `An item that is ${found.status.replace('_', ' ')} cannot move to ${to.replace('_', ' ')}.`,
    );
  found.status = to;
  found.updatedAt = new Date().toISOString();
  return clone(found);
}

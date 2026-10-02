export type ChatMessage = {
  id: string;
  from: 'doctor' | 'patient';
  text: string;
  at: string;
};

/**
 * The chat thread behind one consultation. Read-only fixtures: the admin panel shows
 * the conversation, it never takes part in it.
 */
const THREADS: [ChatMessage['from'], string][][] = [
  [
    ['patient', 'Hello doctor, I have joined a little early.'],
    ['doctor', 'Hello, no problem. I will be with you in two minutes.'],
    ['patient', 'Thank you. I have uploaded my last blood report as well.'],
    ['doctor', 'Received, I will go through it during the consultation.'],
    ['patient', 'The sleep issue has been worse this week.'],
    ['doctor', 'Understood, we will cover that first. Please keep a note of how many hours you slept.'],
  ],
  [
    ['doctor', 'Good morning. Please confirm you can hear me clearly.'],
    ['patient', 'Yes, I can hear you fine.'],
    ['doctor', 'Great. I have shared the care plan in your documents.'],
    ['patient', 'Thanks, I will start from tomorrow.'],
  ],
  [
    ['patient', 'Doctor, the video is freezing on my side.'],
    ['doctor', 'Let us switch to audio for now, that should be steadier.'],
    ['patient', 'Better now, thank you.'],
  ],
];

export const chatFor = (consultationId: string, startsAt: string | null, status: string): ChatMessage[] => {
  // A case that never started has nothing to read.
  if (['pending_payment', 'cancelled', 'expired'].includes(status)) return [];
  const seed = [...consultationId].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const thread = THREADS[seed % THREADS.length];
  const start = (startsAt ? new Date(startsAt) : new Date()).getTime() - 20 * 60_000;
  return thread.map(([from, text], i) => ({
    id: `${consultationId}-m${i}`,
    from,
    text,
    at: new Date(start + i * 3 * 60_000).toISOString(),
  }));
};

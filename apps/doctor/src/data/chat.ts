import { useEffect, useState } from 'react';

import { doctorChatApi } from '@coracure/api';
import type { ChatMessageRecord, ChatThreadSummary, UploadContentType } from '@coracure/api';

import { markThreadRead, mergeThreadMessages, sendMessage, setChatThreads } from '../state/actions';
import { getState } from '../state/store';
import { TODAY, daysBetween, fmtDayTime } from './calendar';
import { UUID } from './clinicalRecord';
import type { Appointment } from './doctor';
import type { ChatMessage, ChatThread } from './messaging';

/**
 * Patient chat against the real backend (`/doctor/chat-threads`).
 *
 * The screens keep reading `state.threads`; this maps the server's
 * conversations onto that shape and sends through the API before the local
 * copy changes. A thread whose id is not a UUID is a spec fixture and stays
 * local.
 *
 *  - A real thread's id IS the patient's id: there is one conversation per
 *    patient, and every route is addressed by it.
 *  - The list names a patient by initials only. Where one of their
 *    consultations is loaded, its name and reference are shown instead — the
 *    name on the appointment the doctor came from.
 *  - There is no push or socket for chat yet, so the list and an open thread
 *    are polled.
 */

export const isServerThread = (threadId: string | undefined): threadId is string => !!threadId && UUID.test(threadId);

// ponytail: polling, because the app has no push library and the backend no socket. Replace both timers with the push when one exists.
export const CHAT_LIST_POLL_MS = 30000;
export const CHAT_THREAD_POLL_MS = 8000;
/** The server's own default page. A full one means there may be more behind it. */
const PAGE = 50;

const GENDER = { male: 'Male', female: 'Female', other: 'Other', undisclosed: '' } as const;

/** "Today, 8:42 AM" / "Yesterday, 7:48 PM" / "Fri, 24 May, 9:10 AM". */
const stamp = (iso: string) => {
  const d = new Date(iso);
  return fmtDayTime(daysBetween(TODAY, d), d.getHours() * 60 + d.getMinutes());
};

export const toMessage = (m: ChatMessageRecord): ChatMessage => ({
  id: m.id,
  from: m.sender === 'doctor' ? 'me' : 'them',
  body: m.body ?? '',
  at: stamp(m.createdAt),
  ...(m.attachmentFileName ? { file: m.attachmentFileName } : {}),
  createdAt: m.createdAt,
});

export const toThread = (t: ChatThreadSummary, appointments: Appointment[]): ChatThread => {
  const p = t.counterpart;
  // their latest loaded consultation: the name the doctor already knows them by, and the way back to it
  const a = appointments
    .filter((x) => x.patientId === p.id)
    .sort((x, y) => y.dayOffset - x.dayOffset || y.minutes - x.minutes)[0];
  const last = t.lastMessage;
  return {
    id: p.id,
    kind: 'patient',
    initials: p.initials ?? '–',
    name: a?.name ?? p.initials ?? 'Patient',
    context: a?.consultationId ?? [p.age === null ? '' : `${p.age} yrs`, GENDER[p.gender]].filter(Boolean).join(' · '),
    patientId: p.id,
    appointmentId: a?.id,
    lastMessage: last ? last.body || last.attachmentFileName || '' : '',
    at: last ? stamp(last.createdAt) : '',
    unread: t.unreadCount,
    internalOnly: false,
  };
};

export const refreshChatThreads = async (): Promise<void> => {
  const list = await doctorChatApi.listThreads();
  setChatThreads(list.map((t) => toThread(t, getState().appointments)));
};

/**
 * The conversations in the store — and so the Messages badge — re-read every
 * `CHAT_LIST_POLL_MS` wherever the tabs are. Off for a doctor not yet
 * verified: the server refuses them, every time.
 */
export const useChatThreads = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    // a missed read is retried on the next tick; nothing to tell the doctor
    const tick = () => refreshChatThreads().catch(() => undefined);
    tick();
    const timer = setInterval(tick, CHAT_LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [enabled]);
};

/**
 * An open conversation: its newest page into the store now, and again every
 * `CHAT_THREAD_POLL_MS` while `active`, so a reply appears without leaving
 * and coming back. Reading it is also what marks it read.
 */
export const useChatThread = (threadId: string | undefined, active: boolean) => {
  const enabled = active && isServerThread(threadId);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>();
  const [hasEarlier, setHasEarlier] = useState(false);

  useEffect(() => {
    if (!enabled || !threadId) return;
    let alive = true;
    let loaded = false;
    let marked: string | undefined;
    const tick = () =>
      doctorChatApi
        .listMessages(threadId, { limit: PAGE })
        .then((rows) => {
          if (!alive) return;
          mergeThreadMessages(threadId, rows.map(toMessage));
          if (!loaded) setHasEarlier(rows.length === PAGE);
          loaded = true;
          setLoading(false);
          setError(undefined);
          // Unread means "from the patient since I last read or wrote", so anything unread is the newest row.
          const newest = rows[0];
          if (newest?.sender === 'patient' && newest.id !== marked) {
            marked = newest.id;
            markThreadRead(threadId);
            doctorChatApi.markRead(threadId).catch(() => undefined);
          }
        })
        .catch((e: unknown) => {
          // only the first load is worth an error; a missed poll is retried by the next
          if (!alive || loaded) return;
          setError(e);
          setLoading(false);
        });
    tick();
    const timer = setInterval(tick, CHAT_THREAD_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled, threadId]);

  /** The page before the oldest message held. */
  const loadEarlier = async () => {
    const oldest = getState().threads.find((t) => t.id === threadId)?.messages.find((m) => m.createdAt)?.createdAt;
    if (!threadId || !oldest) return;
    const rows = await doctorChatApi.listMessages(threadId, { limit: PAGE, before: oldest });
    mergeThreadMessages(threadId, rows.map(toMessage));
    setHasEarlier(rows.length === PAGE);
  };

  return { loading, error, hasEarlier, loadEarlier };
};

/** Text into a thread: through the server for a real one, the store alone for a spec fixture. */
export const sendToThread = async (threadId: string, body: string): Promise<void> => {
  if (!isServerThread(threadId)) return void sendMessage(threadId, body);
  mergeThreadMessages(threadId, [toMessage(await doctorChatApi.sendMessage(threadId, body))]);
};

/** A picked file into a thread — uploaded first, then sent as a message that names it. */
export const sendFileToThread = async (
  threadId: string,
  file: { name: string; uri?: string; contentType?: string },
): Promise<void> => {
  if (!isServerThread(threadId)) return void sendMessage(threadId, '', file.name);
  if (!file.uri || !file.contentType) throw new Error(`${file.name} could not be read. Choose it again.`);
  const sent = await doctorChatApi.sendAttachment(
    threadId,
    { fileName: file.name, contentType: file.contentType as UploadContentType },
    { uri: file.uri },
  );
  mergeThreadMessages(threadId, [toMessage(sent)]);
};

/** A link to one attachment, minted for this tap — it expires in minutes. */
export const chatAttachmentUrl = async (threadId: string, messageId: string): Promise<string> =>
  (await doctorChatApi.attachmentUrl(threadId, messageId)).url;

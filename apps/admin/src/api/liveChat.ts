import { request } from './http';
import type { ChatMessage } from '../mock/consultationChat';

/** `GET /admin/consultations/:id/chat` - governance and operations, read only, on the audit trail. */
type LiveTranscript = {
  messages: {
    id: string;
    sender: 'patient' | 'doctor';
    body: string | null;
    attachmentFileName: string | null;
    createdAt: string;
  }[];
  total: number;
  truncated: boolean;
};

/**
 * The conversation behind one consultation, as the panel's own message shape. A chat belongs to a
 * patient and provider PAIR, so this is their whole thread (the server returns the most recent 500).
 * An attachment is shown by name only: the panel never opens a patient's file from a chat.
 */
export const liveChat = async (consultationId: string): Promise<ChatMessage[]> => {
  const got = await request<LiveTranscript>(`/admin/consultations/${encodeURIComponent(consultationId)}/chat`);
  return got.messages.map((m) => ({
    id: m.id,
    from: m.sender,
    text: [m.body, m.attachmentFileName ? `Attachment: ${m.attachmentFileName}` : null].filter(Boolean).join('\n'),
    at: m.createdAt,
  }));
};

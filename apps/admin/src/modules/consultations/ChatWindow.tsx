import { useCallback } from 'react';

import { consultations } from '../../api/admin';
import type { ChatMessage } from '../../mock/consultationChat';
import { useResource } from '../../lib/useResource';
import { Async, ListSkeleton, Modal, Notice } from '../../ui';

/**
 * The conversation between the doctor and the patient on this case, read-only. Opening it is
 * itself an act worth knowing about, so the window says so.
 *
 * A chat belongs to a patient and provider pair, not to one consultation: this is everything the
 * two have written to each other, across all of their consultations.
 */
export function ChatWindow({
  consultationId,
  doctor,
  patient,
  onClose,
}: {
  consultationId: string;
  doctor: string;
  patient: string;
  onClose: () => void;
}) {
  const fetcher = useCallback(() => consultations.chat(consultationId), [consultationId]);
  const state = useResource<ChatMessage[]>(fetcher, [consultationId]);
  return (
    <Modal open onClose={onClose} title={`Chat - ${doctor} and ${patient}`} width={620}>
      <Notice tone="info">
        Read-only. This is the whole conversation between this patient and provider, not only this
        consultation. Opening it is recorded against your admin account.
      </Notice>
      <Async
        state={state}
        resource="the chat"
        skeleton={<ListSkeleton rows={4} avatar={false} trailing={false} />}
        empty={<p className="muted">No messages have been exchanged between them.</p>}
      >
        {(messages) => (
          <ul className="chatThread" aria-label="Messages">
            {messages.map((m) => (
              <li key={m.id} className={`chatMsg chatMsg--${m.from}`}>
                <span className="chatMsg__who">{m.from === 'doctor' ? doctor : patient}</span>
                <span className="chatMsg__bubble">{m.text}</span>
                <span className="chatMsg__time">{new Date(m.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Modal>
  );
}

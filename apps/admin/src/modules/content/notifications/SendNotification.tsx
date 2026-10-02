import { useState } from 'react';

import {
  BODY_MAX,
  TITLE_MAX,
  deepLinks,
  manualNotifications,
  type Audience,
  type Channel,
  type Recipient,
} from '../../../api/manualNotifications';
import { useMutation, useResource } from '../../../lib/useResource';
import { useToast } from '../../../lib/toast';
import { Button, Card, ConfirmDialog, Notice, SelectField, TextArea, TextField } from '../../../ui';

/**
 * Send a notification by hand to doctors or patients.
 *
 * *** A NOTIFICATION NEVER NAMES A DIAGNOSIS (FR-16.2). *** Free text cannot be
 * checked for that, so the rule is stated as a reminder beside the form and
 * only length and non-empty are validated. A word list would be incomplete and
 * would give a false sense of safety.
 */
export function SendNotification() {
  const toast = useToast();
  const [audience, setAudience] = useState<Audience>('doctor');
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Recipient[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['in_app', 'push']);
  const [confirming, setConfirming] = useState(false);

  // The whole audience, loaded once per audience; the picker filters it locally.
  const people = useResource<Recipient[]>(() => manualNotifications.recipients(audience), [audience]);
  const send = useMutation(manualNotifications.send);

  const noun = audience === 'doctor' ? 'doctors' : 'patients';
  const total = people.data?.length ?? 0;
  const q = search.trim().toLowerCase();
  const matches = (people.data ?? []).filter(
    (r) => r.name.toLowerCase().includes(q) && !picked.some((p) => p.id === r.id),
  );

  const titleError = title.length > TITLE_MAX ? `Max ${TITLE_MAX} characters.` : undefined;
  const bodyError = body.length > BODY_MAX ? `Max ${BODY_MAX} characters.` : undefined;
  const valid =
    title.trim() !== '' &&
    body.trim() !== '' &&
    !titleError &&
    !bodyError &&
    channels.length > 0 &&
    (mode === 'all' ? total > 0 : picked.length > 0);

  const count = mode === 'all' ? total : picked.length;

  const doSend = async () => {
    try {
      const sent = await send.mutate({
        audience,
        recipientIds: mode === 'all' ? [] : picked.map((p) => p.id),
        title,
        body,
        deepLink,
        channels,
      });
      toast.success(`Notification sent to ${sent.recipientCount} ${noun}.`);
      setTitle('');
      setBody('');
      setDeepLink('');
      setPicked([]);
    } catch (e) {
      // The form keeps its text so the admin can retry.
      toast.fromError(e);
    }
    setConfirming(false);
  };

  const toggleChannel = (c: Channel) =>
    setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  return (
    <div className="stack">
      <Notice tone="danger">
        Never name a diagnosis, a condition or a medication. This is a reminder, not a check — the
        text is not scanned, and a push can be read on a lock screen by someone else.
      </Notice>

      <Card title="Who receives it">
        <SelectField
          label="Audience"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value as Audience);
            setPicked([]);
            setSearch('');
          }}
          options={[
            { value: 'doctor', label: 'Doctors' },
            { value: 'patient', label: 'Patients' },
          ]}
        />
        <SelectField
          label="Recipients"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'all' | 'selected')}
          options={[
            { value: 'all', label: `All ${noun}` },
            { value: 'selected', label: `Specific ${noun}` },
          ]}
        />
        {mode === 'selected' && (
          <>
            <TextField
              label={`Search ${noun}`}
              value={search}
              placeholder="Type a name"
              onChange={(e) => setSearch(e.target.value)}
            />
            {picked.length > 0 && (
              <p className="rowActions" aria-label="Selected recipients">
                {picked.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="secondary"
                    icon="close"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => setPicked((cur) => cur.filter((x) => x.id !== p.id))}
                  >
                    {p.name}
                  </Button>
                ))}
              </p>
            )}
            <ul className="plainList" aria-label="Matching recipients">
              {matches.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPicked((cur) => [...cur, r])}
                    aria-label={`Add ${r.name}`}
                  >
                    {r.name} · {r.detail}
                  </Button>
                </li>
              ))}
              {matches.length === 0 && <li>No one matches.</li>}
            </ul>
          </>
        )}
      </Card>

      <Card title="Message">
        <TextField
          label="Title"
          required
          value={title}
          error={titleError}
          hint={`${title.length}/${TITLE_MAX}`}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextArea
          label="Message"
          required
          rows={4}
          value={body}
          error={bodyError}
          hint={`${body.length}/${BODY_MAX}`}
          onChange={(e) => setBody(e.target.value)}
        />
        <SelectField
          label="Opens (optional)"
          value={deepLink}
          onChange={(e) => setDeepLink(e.target.value)}
          options={deepLinks}
        />
        <fieldset className="checkGroup">
          <legend>Delivery channel</legend>
          <label className="checkOption">
            <input
              type="checkbox"
              checked={channels.includes('in_app')}
              onChange={() => toggleChannel('in_app')}
            />
            In-app
          </label>
          <label className="checkOption">
            <input
              type="checkbox"
              checked={channels.includes('push')}
              onChange={() => toggleChannel('push')}
            />
            Push
          </label>
        </fieldset>
      </Card>

      <Card title="Preview">
        <strong>{title.trim() || 'Title'}</strong>
        <p>{body.trim() || 'Your message appears here.'}</p>
        <small>
          {channels.map((c) => (c === 'push' ? 'Push' : 'In-app')).join(' + ') || 'No channel'}
          {deepLink ? ` · opens ${deepLink}` : ''}
        </small>
      </Card>

      <div>
        <Button
          variant="primary"
          icon="bell"
          disabled={!valid}
          loading={send.busy}
          onClick={() => (mode === 'all' ? setConfirming(true) : void doSend())}
        >
          Send notification
        </Button>
      </div>

      {confirming && (
      <ConfirmDialog
        open
        busy={send.busy}
        onClose={() => setConfirming(false)}
        variant="primary"
        title="Send to everyone?"
        confirmLabel="Send now"
        consequence={`This will notify ${count} ${noun}. A sent notification cannot be recalled.`}
        onConfirm={() => void doSend()}
      />
      )}
    </div>
  );
}

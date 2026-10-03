import { useCallback, useState } from 'react';

import { searchConfig, type SearchConfigShape } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Notice,
  PageHeader,
  TextArea,
  may,
} from '../../ui';

/**
 * Search and crisis configuration (§36, FR-5.6–5.8).
 *
 * *** THE PATIENT APP RUNS NO KEYWORD LIST OF ITS OWN. *** It renders what
 * these endpoints return. So an empty crisis-keyword save silently disables
 * the crisis interrupt for every patient - the form refuses to submit an empty
 * list rather than trusting the admin, and says why.
 *
 * Crisis keywords and emergency guidance are clinical_governance only; the
 * rest is shared with content.
 */
export function SearchConfig({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => searchConfig.get(), []);
  const state = useResource<SearchConfigShape>(fetcher, []);

  const canSafety = may(level, ['clinical_governance']);
  const canContent = may(level, ['content', 'clinical_governance']);

  return (
    <>
      <PageHeader
        title="Search & crisis configuration"
        description="What the patient's search matches on, and what someone in crisis is shown."
      />

      <Async state={state} resource="search configuration">
        {(config) => (
          <>
            <CrisisKeywords
              initial={config.crisisKeywords ?? []}
              editable={canSafety}
              onSaved={state.reload}
            />
            <Disclaimer
              initial={config.disclaimer ?? ''}
              editable={canContent}
              onSaved={state.reload}
            />
            <PopularSearches
              initial={config.popularSearches ?? []}
              editable={may(level, ['content'])}
              onSaved={state.reload}
            />
          </>
        )}
      </Async>
    </>
  );
}

function CrisisKeywords({
  initial,
  editable,
  onSaved,
}: {
  initial: string[];
  editable: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState(initial.join('\n'));
  const save = useMutation(searchConfig.crisisKeywords);

  const keywords = text
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  // The guard that matters on this screen.
  const emptyError = keywords.length === 0 ? 'The crisis keyword list cannot be empty.' : null;

  return (
    <Card title="Crisis keywords">
      <Notice tone="danger">
        These are what trigger the crisis interrupt in the patient app.{' '}
        <strong>Saving an empty list disables that interrupt for every patient</strong>, so it is
        refused here.
      </Notice>

      <TextArea
        label="Keywords"
        rows={8}
        value={text}
        disabled={!editable}
        error={editable ? emptyError : null}
        hint="One per line."
        onChange={(e) => setText(e.target.value)}
      />

      {editable ? (
        <div className="formActions">
          <Button
            variant="primary"
            loading={save.busy}
            disabled={Boolean(emptyError)}
            onClick={async () => {
              try {
                await save.mutate(keywords);
                toast.success('Crisis keywords updated.');
                onSaved();
              } catch (e) {
                toast.fromError(e);
              }
            }}
          >
            Save keywords
          </Button>
        </div>
      ) : (
        <p className="muted small">
          Read-only for your role - safety-critical configuration is clinical governance&apos;s.
        </p>
      )}
    </Card>
  );
}

function Disclaimer({
  initial,
  editable,
  onSaved,
}: {
  initial: string;
  editable: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState(initial);
  const save = useMutation(searchConfig.disclaimer);

  return (
    <Card title="Search disclaimer">
      <Notice tone="info">
        FR-5.8 requires this wording to appear with every search result. The AI assists navigation
        only - it must not appear to screen, diagnose or triage.
      </Notice>
      <TextArea
        label="Disclaimer"
        rows={3}
        value={text}
        disabled={!editable}
        onChange={(e) => setText(e.target.value)}
      />
      {editable && (
        <div className="formActions">
          <Button
            variant="primary"
            loading={save.busy}
            disabled={!text.trim()}
            onClick={async () => {
              try {
                await save.mutate(text.trim());
                toast.success('Disclaimer updated.');
                onSaved();
              } catch (e) {
                toast.fromError(e);
              }
            }}
          >
            Save disclaimer
          </Button>
        </div>
      )}
    </Card>
  );
}

function PopularSearches({
  initial,
  editable,
  onSaved,
}: {
  initial: string[];
  editable: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState(initial.join('\n'));
  const save = useMutation(searchConfig.popularSearches);

  if (!editable) return null;

  return (
    <Card title="Popular searches">
      <TextArea
        label="Suggestions"
        rows={5}
        value={text}
        hint="One per line. Shown as starting points on the patient's search screen."
        onChange={(e) => setText(e.target.value)}
      />
      <div className="formActions">
        <Button
          variant="primary"
          loading={save.busy}
          onClick={async () => {
            try {
              await save.mutate(text.split('\n').map((s) => s.trim()).filter(Boolean));
              toast.success('Popular searches updated.');
              onSaved();
            } catch (e) {
              toast.fromError(e);
            }
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

import { useCallback, useMemo, useState } from 'react';

import { pathways, type Pathway } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge,
  SelectField,
  Table,
  TextArea,
  TextField,
  may,
} from '../../ui';

/**
 * Follow-up pathways — the daily check-in question sets and the red-flag rules
 * that turn an answer into a safety alert (§37, FR-13.7).
 *
 * *** POSTING PUBLISHES A NEW VERSION. IT NEVER EDITS THE LIVE ONE. ***
 * So the editor is "duplicate the current version, change it, publish", and
 * patients already on a pathway stay on the version they started. There is
 * deliberately no in-place edit form — building one would imply the live
 * version can be changed under a patient mid-course, which it cannot.
 */
export function Pathways({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => pathways.list(), []);
  const state = useResource<Pathway[]>(fetcher, []);
  const [editing, setEditing] = useState<Pathway | null>(null);

  const canPublish = may(level, ['clinical_governance', 'content']);

  /** Newest version of each code first — §37. */
  const ordered = useMemo(
    () => (rows: Pathway[]) =>
      [...rows].sort((a, b) => {
        if (a.code !== b.code) return a.code.localeCompare(b.code);
        return (b.version ?? 0) - (a.version ?? 0);
      }),
    [],
  );

  const columns: Column<Pathway>[] = [
    {
      key: 'code',
      header: 'Pathway',
      render: (p) => (
        <span className="cellStack">
          <strong>{p.code}</strong>
          <small>Version {p.version ?? '—'}</small>
        </span>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      render: (p) => (p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'live',
      header: '',
      width: '110px',
      render: (p, ) => <StatusBadge status="published" label={`v${p.version ?? '?'}`} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '200px',
      render: (p) =>
        canPublish ? (
          <span className="rowActions">
            <Button size="sm" variant="secondary" icon="plus" onClick={() => setEditing(p)}>
              New version from this
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Follow-up pathways"
        description="Check-in question sets and the red-flag rules that raise safety alerts."
      />

      <Notice tone="warning">
        Publishing creates a <strong>new version</strong>; the live one is never edited in place. A
        patient already on a pathway stays on the version they started, which is why the red-flag
        rules must fire identically for everyone on a given version.
      </Notice>

      <Async
        state={state}
        resource="pathways"
        empty={
          <EmptyState
            icon="pathway"
            title="No pathways published"
            description="Follow-up question sets are authored here before any patient can be put on one."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Follow-up pathways"
            columns={columns}
            rows={ordered(rows)}
            rowKey={(p) => `${p.code}-${p.version ?? 'x'}`}
          />
        )}
      </Async>

      {editing && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <NewVersion
            from={editing}
            onClose={() => setEditing(null)}
            onPublished={() => {
              setEditing(null);
              state.reload();
            }}
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------ the editor ------------------------------- */

type QType = 'yes_no' | 'single_choice' | 'scale' | 'text';
type Question = {
  id: string;
  text: string;
  type: QType;
  /** One per line while editing; turned into `{ value, label }` on publish. */
  options: string;
  required: boolean;
};
type Rule = { questionId: string; whenAnswerIn: string[]; category: string; reason: string };

const TYPES: { value: QType; label: string }[] = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'single_choice', label: 'Pick one' },
  { value: 'scale', label: 'Scale' },
  { value: 'text', label: 'Free text' },
];

/** The backend's own list — an admin picks from these, they cannot invent another. */
const CATEGORIES = [
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'severe_worsening', label: 'Severe worsening' },
  { value: 'confusion_or_agitation', label: 'Confusion or agitation' },
  { value: 'violence_risk', label: 'Violence risk' },
  { value: 'severe_withdrawal', label: 'Severe withdrawal' },
  { value: 'medication_side_effect', label: 'Medication side effect' },
  { value: 'feeling_unsafe', label: 'Feeling unsafe' },
];

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const newId = () => `q_${Math.random().toString(36).slice(2, 8)}`;

const optionsOf = (q: Question) =>
  q.options
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label) => ({ value: slug(label) || label, label }));

/** Reads whatever the stored version holds into the editor's shape, tolerating a malformed one. */
const loadQuestions = (raw: unknown): Question[] =>
  (Array.isArray(raw) ? raw : []).map((r) => {
    const x = r as { id?: string; text?: string; type?: QType; options?: { label?: string }[]; required?: boolean };
    return {
      id: x.id ?? newId(),
      text: x.text ?? '',
      type: x.type ?? 'yes_no',
      options: (x.options ?? []).map((o) => o.label ?? '').join('\n'),
      required: Boolean(x.required),
    };
  });

const loadRules = (raw: unknown): Rule[] =>
  (Array.isArray(raw) ? raw : []).map((r) => {
    const x = r as Partial<Rule>;
    return {
      questionId: x.questionId ?? '',
      whenAnswerIn: x.whenAnswerIn ?? [],
      category: x.category ?? 'self_harm',
      reason: x.reason ?? '',
    };
  });

/** The answers a rule can fire on, for the question it is attached to. */
const answersFor = (q: Question | undefined): { value: string; label: string }[] => {
  if (!q) return [];
  if (q.type === 'yes_no')
    return [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];
  if (q.type === 'text') return [];
  return optionsOf(q);
};

/**
 * Duplicate-and-publish. The current version's content is pre-loaded so the
 * admin edits a copy rather than starting from nothing. Questions and rules are
 * edited as fields — the JSON the backend wants is built only when publishing.
 */
function NewVersion({
  from,
  onClose,
  onPublished,
}: {
  from: Pathway;
  onClose: () => void;
  onPublished: () => void;
}) {
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[]>(() => loadQuestions(from.questions));
  const [rules, setRules] = useState<Rule[]>(() => loadRules(from.redFlagRules));
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const publish = useMutation(pathways.publish);

  const patchQ = (i: number, patch: Partial<Question>) =>
    setQuestions((cur) => cur.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const patchR = (i: number, patch: Partial<Rule>) =>
    setRules((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  /** Names the first thing wrong, in the editor's own words. */
  const check = (): string | null => {
    if (questions.length === 0) return 'Add at least one question.';
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) return `Question ${i + 1} has no wording.`;
      if (q.text.length > 300) return `Question ${i + 1} is over 300 characters.`;
      if ((q.type === 'single_choice' || q.type === 'scale') && optionsOf(q).length < 2)
        return `Question ${i + 1} needs at least two answer options.`;
      if (optionsOf(q).length > 10) return `Question ${i + 1} has more than 10 options.`;
    }
    for (const [i, r] of rules.entries()) {
      if (!questions.some((q) => q.id === r.questionId)) return `Rule ${i + 1}: choose a question.`;
      if (r.whenAnswerIn.length === 0) return `Rule ${i + 1}: choose which answers raise it.`;
      if (!r.reason.trim()) return `Rule ${i + 1}: write the reason, in plain words.`;
      if (r.reason.length > 255) return `Rule ${i + 1}: the reason is over 255 characters.`;
    }
    return null;
  };

  const body = () => ({
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text.trim(),
      type: q.type,
      ...(q.type === 'single_choice' || q.type === 'scale' ? { options: optionsOf(q) } : {}),
      ...(q.required ? { required: true } : {}),
    })),
    redFlagRules: rules.map((r) => ({
      questionId: r.questionId,
      whenAnswerIn: r.whenAnswerIn,
      category: r.category,
      reason: r.reason.trim(),
    })),
  });

  return (
    <>
      <Card title={`New version of ${from.code}`}>
        <p className="muted">
          Starting from version {from.version ?? '—'}. Publishing makes this the version every new
          patient is put on.
        </p>

        <h3 className="subhead">Questions</h3>
        <p className="fieldHint">The wording is clinical content and needs clinician sign-off.</p>
        {questions.length === 0 && <p className="muted">No questions yet.</p>}
        {questions.map((q, i) => (
          <div className="pwItem" key={q.id}>
            <div className="pwItem__head">
              <strong>Question {i + 1}</strong>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  // A rule on a deleted question would point at nothing.
                  setQuestions((cur) => cur.filter((_, j) => j !== i));
                  setRules((cur) => cur.filter((r) => r.questionId !== q.id));
                }}
              >
                Remove
              </Button>
            </div>
            <TextField label="Wording" value={q.text} onChange={(e) => patchQ(i, { text: e.target.value })} />
            <div className="formGrid">
              <SelectField
                label="Answered by"
                value={q.type}
                onChange={(e) => patchQ(i, { type: e.target.value as QType })}
                options={TYPES}
              />
              <label className="checkOption">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => patchQ(i, { required: e.target.checked })}
                />
                The patient must answer
              </label>
            </div>
            {(q.type === 'single_choice' || q.type === 'scale') && (
              <TextArea
                label="Answer options"
                rows={4}
                value={q.options}
                hint="One per line, at most 10."
                onChange={(e) => patchQ(i, { options: e.target.value })}
              />
            )}
          </div>
        ))}
        <div className="formActions">
          <Button
            type="button"
            variant="secondary"
            icon="plus"
            onClick={() =>
              setQuestions((cur) => [
                ...cur,
                { id: newId(), text: '', type: 'yes_no', options: '', required: false },
              ])
            }
          >
            Add question
          </Button>
        </div>

        <h3 className="subhead">Red-flag rules</h3>
        <p className="fieldHint">These turn a check-in answer into a safety alert.</p>
        {rules.length === 0 && <p className="muted">No rules yet — no answer will raise an alert.</p>}
        {rules.map((r, i) => {
          const q = questions.find((x) => x.id === r.questionId);
          return (
            <div className="pwItem" key={i}>
              <div className="pwItem__head">
                <strong>Rule {i + 1}</strong>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRules((cur) => cur.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
              <div className="formGrid">
                <SelectField
                  label="When this question…"
                  value={r.questionId}
                  onChange={(e) => patchR(i, { questionId: e.target.value, whenAnswerIn: [] })}
                  options={[
                    { value: '', label: 'Choose…' },
                    ...questions
                      .filter((x) => x.type !== 'text' && x.text.trim())
                      .map((x) => ({ value: x.id, label: x.text.trim() })),
                  ]}
                />
                <SelectField
                  label="…raises an alert of"
                  value={r.category}
                  onChange={(e) => patchR(i, { category: e.target.value })}
                  options={CATEGORIES}
                />
              </div>
              {q && (
                <fieldset className="checkGroup">
                  <legend>…is answered</legend>
                  {answersFor(q).map((a) => (
                    <label key={a.value} className="checkOption">
                      <input
                        type="checkbox"
                        checked={r.whenAnswerIn.includes(a.value)}
                        onChange={(e) =>
                          patchR(i, {
                            whenAnswerIn: e.target.checked
                              ? [...r.whenAnswerIn, a.value]
                              : r.whenAnswerIn.filter((v) => v !== a.value),
                          })
                        }
                      />
                      {a.label}
                    </label>
                  ))}
                </fieldset>
              )}
              <TextField
                label="Reason shown with the alert"
                value={r.reason}
                hint="Plain words, never a diagnosis. Up to 255 characters."
                onChange={(e) => patchR(i, { reason: e.target.value })}
              />
            </div>
          );
        })}
        <div className="formActions">
          <Button
            type="button"
            variant="secondary"
            icon="plus"
            disabled={questions.length === 0}
            onClick={() =>
              setRules((cur) => [...cur, { questionId: '', whenAnswerIn: [], category: 'self_harm', reason: '' }])
            }
          >
            Add rule
          </Button>
        </div>

        {problem && <p className="fieldError">{problem}</p>}

        <div className="formActions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const found = check();
              setProblem(found);
              if (!found) setConfirming(true);
            }}
          >
            Publish new version
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming}
        busy={publish.busy}
        onClose={() => setConfirming(false)}
        variant="primary"
        title={`Publish a new version of ${from.code}?`}
        confirmLabel="Publish version"
        consequence={
          <>
            Every patient <strong>starting</strong> this pathway from now on gets the new version.
            Patients already on it stay on the version they began, so nothing changes under them
            mid-course.
          </>
        }
        onConfirm={async () => {
          try {
            await publish.mutate(from.code, body());
            toast.success('New version published.');
            onPublished();
          } catch (e) {
            toast.fromError(e);
          }
          setConfirming(false);
        }}
      />
    </>
  );
}

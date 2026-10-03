import { useCallback, useEffect, useState } from 'react';

import {
  CONCERNS,
  ITEM_TYPES,
  SPECIALTIES,
  careHub,
  emptyInput,
  type CareHubInput,
  type CareHubItem,
  type CareHubType,
} from '../../../api/careHub';
import { useMutation, useResource } from '../../../lib/useResource';
import { useToast } from '../../../lib/toast';
import type { AdminLevel } from '../../../nav';
import {
  Async,
  Button,
  Card,
  ConfirmDialog,
  Notice,
  PageHeader,
  SelectField,
  StatusBadge,
  TextArea,
  TextField,
} from '../../../ui';
import { BodyEditor } from './BodyEditor';
import { ImageUpload } from './ImageUpload';
import { ItemActions } from './ItemActions';
import { ItemPreview } from './ItemPreview';
import { YouTubeField } from './YouTubeField';
import { slugify, validate, type FormErrors } from './validate';
import { parseYouTube } from './youtube';

const toInput = (i: CareHubItem): CareHubInput => {
  // Strip the server-owned fields; the rest is the editable form.
  const { id: _id, status: _status, updatedAt: _updatedAt, ...rest } = i;
  void _id; void _status; void _updatedAt;
  return rest;
};

/**
 * Full-page editor, addressed as `?edit=new` or `?edit=<id>` on the Care Hub
 * route. Loads the item (when editing), then hands a clean copy to the form.
 */
export function ItemEditor({
  id,
  level,
  onClose,
}: {
  id: string;
  level: AdminLevel;
  onClose: () => void;
}) {
  const isNew = id === 'new';
  const fetcher = useCallback(() => careHub.item(id), [id]);
  const state = useResource<CareHubItem>(fetcher, [id], !isNew);

  if (isNew) return <EditorForm item={null} level={level} onClose={onClose} />;
  return (
    <Async state={state} resource="this item">
      {(item) => <EditorForm item={item} level={level} onClose={onClose} />}
    </Async>
  );
}

function EditorForm({
  item,
  level,
  onClose,
}: {
  item: CareHubItem | null;
  level: AdminLevel;
  onClose: () => void;
}) {
  const toast = useToast();
  const [initial] = useState<CareHubInput>(() => (item ? toInput(item) : emptyInput()));
  const [form, setForm] = useState<CareHubInput>(initial);
  // Once the admin edits the slug by hand, the title stops rewriting it.
  const [slugTouched, setSlugTouched] = useState(item !== null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const save = useMutation(careHub.save);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // Unsaved-changes guard for closing the tab or reloading. In-app leaving goes
  // through `requestClose` below. (BrowserRouter has no route blocker.)
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const requestClose = () => (dirty ? setLeaving(true) : onClose());

  const patch = (p: Partial<CareHubInput>) => {
    setForm((f) => ({ ...f, ...p }));
    // Clear an error as soon as its field is touched; re-validated on save.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(p)) delete next[k as keyof FormErrors];
      return next;
    });
  };

  const onSave = async () => {
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const parsed = form.videoUrl.trim() ? parseYouTube(form.videoUrl) : null;
    try {
      await save.mutate({ ...form, videoId: parsed?.ok ? parsed.id : '' }, item?.id);
      toast.success(item ? 'Changes saved.' : 'Draft created.');
      onClose();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'CONFLICT') setErrors({ slug: 'That slug is already used by another item.' });
      else toast.fromError(e);
    }
  };

  const errorCount = Object.keys(errors).length;
  const isSupport = form.type === 'support_org';

  return (
    <>
      <PageHeader
        title={item ? 'Edit Care Hub item' : 'New Care Hub item'}
        description={item ? item.title : 'Drafts are not visible to patients until clinical governance publishes them.'}
        actions={
          <Button variant="ghost" icon="arrowLeft" onClick={requestClose}>
            Back to library
          </Button>
        }
      />

      <div className="chEditor">
        <form
          className="chEditor__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          {errorCount > 0 && (
            <Notice tone="danger">Fix the {errorCount === 1 ? 'highlighted field' : `${errorCount} highlighted fields`} before saving.</Notice>
          )}

          <Card title="Basics">
            <SelectField
              label="Type"
              required
              value={form.type}
              options={ITEM_TYPES}
              onChange={(e) => patch({ type: e.target.value as CareHubType })}
            />
            <TextField
              label="Title"
              required
              maxLength={200}
              value={form.title}
              error={errors.title}
              hint={`${form.title.length}/200`}
              onChange={(e) =>
                patch({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })
              }
            />
            <TextField
              label="Slug"
              required
              value={form.slug}
              error={errors.slug}
              hint="The stable address of this item. Filled from the title until you edit it."
              onChange={(e) => {
                setSlugTouched(true);
                patch({ slug: e.target.value });
              }}
            />
            <TextArea
              label="Short summary"
              rows={3}
              value={form.summary}
              error={errors.summary}
              hint={`${form.summary.length}/400 - shown on the patient shelf card.`}
              onChange={(e) => patch({ summary: e.target.value })}
            />
            <div className="formGrid">
              <SelectField
                label="Concern"
                value={form.concern}
                options={[{ value: '', label: 'None' }, ...CONCERNS.map((c) => ({ value: c, label: c }))]}
                onChange={(e) => patch({ concern: e.target.value })}
              />
              <SelectField
                label="Specialty"
                hint="Used by clinical references."
                value={form.specialty}
                options={[{ value: '', label: 'None' }, ...SPECIALTIES.map((c) => ({ value: c, label: c }))]}
                onChange={(e) => patch({ specialty: e.target.value })}
              />
            </div>
          </Card>

          <Card title="Cover image">
            <ImageUpload value={form.coverUrl} title={form.title} onChange={(coverUrl) => patch({ coverUrl })} />
          </Card>

          <Card title="Video">
            <YouTubeField value={form.videoUrl} submitted={submitted} onChange={(videoUrl) => {
              patch({ videoUrl });
              // Keep the preview in step with what was typed.
              const p = videoUrl.trim() ? parseYouTube(videoUrl) : null;
              setForm((f) => ({ ...f, videoId: p?.ok ? p.id : '' }));
            }} />
          </Card>

          <Card title="Content">
            <BodyEditor value={form.body} onChange={(body) => patch({ body })} />
          </Card>

          {isSupport && (
            <Card title="Support organisation">
              <TextArea
                label="Helpline numbers"
                rows={3}
                hint="One number per line."
                value={form.helplines.join('\n')}
                error={errors.helplines}
                onChange={(e) => patch({ helplines: e.target.value.split('\n') })}
              />
              <TextField
                label="Website"
                type="url"
                placeholder="https://"
                value={form.website}
                error={errors.website}
                onChange={(e) => patch({ website: e.target.value })}
              />
              <label className="chCheck">
                <input
                  type="checkbox"
                  checked={form.verifiedOrg}
                  onChange={(e) => patch({ verifiedOrg: e.target.checked })}
                />
                Verified organisation
              </label>
            </Card>
          )}

          <Card title="Publishing">
            <div className="row">
              <span>Status</span>
              <StatusBadge status={item?.status ?? 'draft'} />
              {item && <ItemActions item={item} level={level} disabled={dirty} onDone={(m) => { toast.success(m); onClose(); }} />}
            </div>
            {item && dirty && <p className="fieldHint">Save your changes before changing the status.</p>}
            {item && (item.status === 'in_review' || item.status === 'published') && (
              <Notice tone="warning">
                Saving edits returns this item to draft, so the changed wording is reviewed again before patients see it.
              </Notice>
            )}
            <TextField
              label="Shelf order"
              type="number"
              min={0}
              value={String(form.sortOrder)}
              error={errors.sortOrder}
              hint="Lower numbers appear first."
              onChange={(e) => patch({ sortOrder: e.target.value === '' ? NaN : Number(e.target.value) })}
            />
          </Card>

          <div className="chSave">
            <Button variant="ghost" onClick={requestClose} disabled={save.busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={save.busy}>
              {item ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </form>

        <aside className="chEditor__preview">
          <ItemPreview item={form} />
        </aside>
      </div>

      {leaving && (
        <ConfirmDialog
          open
          onClose={() => setLeaving(false)}
          title="Discard unsaved changes?"
          confirmLabel="Discard changes"
          consequence="You have edits that have not been saved. Leaving now loses them."
          onConfirm={onClose}
        />
      )}
    </>
  );
}

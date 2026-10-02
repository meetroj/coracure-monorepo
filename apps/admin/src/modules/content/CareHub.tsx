import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { careHub, type CareHubItem } from '../../api/careHub';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { may } from '../../ui';
import { CareHubLibrary } from './carehub/CareHubLibrary';
import { ItemEditor } from './carehub/ItemEditor';

/**
 * Care Hub content manager (§34).
 *
 * draft → submit → in review → publish → archived.
 *
 * *** PUBLISH IS CLINICAL GOVERNANCE ONLY. *** A content editor writes and
 * submits; only clinical governance signs it off, because this is
 * patient-facing clinical content requiring clinician sign-off. A `content`
 * admin never sees a Publish button at all, rather than a disabled one.
 *
 * The editor lives at `?edit=new` / `?edit=<id>` on this same route, so it is
 * addressable and Back works, without a new route in the app shell.
 */
export function CareHub({ level }: { level: AdminLevel }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const fetcher = useCallback(() => careHub.items(), []);
  const state = useResource<CareHubItem[]>(fetcher, []);

  const canAuthor = may(level, ['content', 'clinical_governance']);
  const editing = params.get('edit');

  const close = () => {
    setParams({});
    state.reload();
  };

  // Only authors reach the editor; a pasted ?edit= link falls back to the library.
  if (editing && canAuthor) return <ItemEditor id={editing} level={level} onClose={close} />;

  return (
    <>
      <CareHubLibrary
        state={state}
        level={level}
        onEdit={(id) => setParams({ edit: id })}
        onNew={() => setParams({ edit: 'new' })}
        onChanged={(message) => {
          toast.success(message);
          state.reload();
        }}
      />
    </>
  );
}

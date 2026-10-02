import * as db from '../mock/db';
import * as store from '../mock/careHub';
import type { CareHubInput, CareHubItem } from '../mock/careHub';

export * from '../mock/careHub';

/**
 * Care Hub data surface (UI-ONLY build, like `api/admin.ts`).
 *
 * Richer than `admin.content`: cover image, YouTube video, structured body and
 * support-org fields. Same async signature a real endpoint would have, so
 * wiring it up later is a body-swap here. Nothing touches the network.
 */
const ok = <T>(fn: () => T): Promise<T> => db.delay(null).then(fn);

export const careHub = {
  items: () => ok(() => store.list()),
  item: (id: string) => ok(() => store.get(id)),
  /** Create (no id) or edit. Create is always a draft. */
  save: (input: CareHubInput, id?: string): Promise<CareHubItem> => ok(() => store.save(input, id)),
  submit: (id: string) => ok(() => store.transition(id, 'in_review')),
  publish: (id: string) => ok(() => store.transition(id, 'published')),
  archive: (id: string) => ok(() => store.transition(id, 'archived')),
};

import { api } from '../http';

/**
 * The Care Hub library, as a doctor picks from it (FR-15.4). Published items
 * only — the server never returns a draft, so anything listed here can be put
 * in `recommendedContentIds` without a `CONTENT_NOT_RECOMMENDABLE` refusal,
 * unless it is archived between the read and the save.
 */

export type ContentItemType =
  | 'self_help_tool'
  | 'education_module'
  | 'blog_article'
  | 'caregiver_guide'
  | 'emergency_guidance'
  | 'support_org'
  | 'clinical_reference';

export type CareHubItem = {
  id: string;
  itemType: ContentItemType;
  slug: string;
  title: string;
  summary: string | null;
  concernId: string | null;
  specialtyId: string | null;
  coverStorageKey: string | null;
  isVerifiedOrg: boolean | null;
  sortOrder: number;
};

export const listItems = (query: { itemType?: ContentItemType; concernId?: string; limit?: number } = {}): Promise<CareHubItem[]> =>
  api.get<CareHubItem[]>('/care-hub/items', { query });

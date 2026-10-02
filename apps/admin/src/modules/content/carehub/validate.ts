import type { CareHubInput } from '../../../api/careHub';
import { parseYouTube } from './youtube';

export type FormErrors = Partial<
  Record<'title' | 'slug' | 'summary' | 'videoUrl' | 'website' | 'helplines' | 'sortOrder', string>
>;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);

/** Field-level checks mirroring the backend's column limits. */
export function validate(f: CareHubInput): FormErrors {
  const e: FormErrors = {};
  if (!f.title.trim()) e.title = 'Title is required.';
  else if (f.title.length > 200) e.title = 'Title must be 200 characters or fewer.';

  if (!f.slug) e.slug = 'Slug is required.';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug))
    e.slug = 'Use lowercase letters, numbers and single hyphens.';
  else if (f.slug.length > 160) e.slug = 'Slug must be 160 characters or fewer.';

  if (f.summary.length > 400) e.summary = 'Summary must be 400 characters or fewer.';

  if (f.videoUrl.trim()) {
    const p = parseYouTube(f.videoUrl);
    if (!p.ok) e.videoUrl = p.error;
  }

  if (!Number.isInteger(f.sortOrder) || f.sortOrder < 0 || f.sortOrder > 32767)
    e.sortOrder = 'Use a whole number from 0 to 32767.';

  if (f.type === 'support_org') {
    if (f.website.trim() && !/^https?:\/\/\S+\.\S+$/i.test(f.website.trim()))
      e.website = 'Enter a full web address starting with http:// or https://.';
    if (f.helplines.some((h) => h.trim() && !/^[+\d][\d\s()-]{2,}$/.test(h.trim())))
      e.helplines = 'Helpline numbers may contain digits, spaces, + ( ) and - only.';
  }
  return e;
}

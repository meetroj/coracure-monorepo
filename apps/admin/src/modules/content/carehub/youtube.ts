/**
 * YouTube link parsing for Care Hub video items.
 *
 * Accepts watch?v=, youtu.be/, /embed/ and /shorts/ (plus /live/ and /v/, which
 * share the shape). Anything else — another host, a channel, a playlist with no
 * video — is rejected with a message the editor shows under the field.
 */

export type YouTubeResult = { ok: true; id: string } | { ok: false; error: string };

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const BAD = 'Enter a YouTube link, e.g. https://www.youtube.com/watch?v=… or https://youtu.be/…';

export function parseYouTube(input: string): YouTubeResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'Enter a YouTube link.' };

  let url: URL;
  try {
    // A pasted `youtu.be/abc` with no scheme is still a link.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: BAD };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: BAD };

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let id: string | undefined;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = parts[0];
  } else if (HOSTS.has(host)) {
    if (parts[0] === 'watch') id = url.searchParams.get('v') ?? undefined;
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1];
  } else {
    return { ok: false, error: 'Only YouTube links are supported.' };
  }

  if (!id || !ID.test(id)) return { ok: false, error: 'That YouTube link has no valid video id.' };
  return { ok: true, id };
}

export const youTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const youTubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

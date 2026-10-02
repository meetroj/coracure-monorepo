import { describe, expect, it } from 'vitest';

import { parseYouTube, youTubeThumbnail } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTube', () => {
  it.each([
    ['watch', `https://www.youtube.com/watch?v=${ID}`],
    ['short link', `https://youtu.be/${ID}`],
    ['embed', `https://www.youtube.com/embed/${ID}`],
    ['shorts', `https://www.youtube.com/shorts/${ID}`],
    ['mobile host', `https://m.youtube.com/watch?v=${ID}`],
    ['no scheme', `youtu.be/${ID}`],
    ['surrounding space', `  https://youtu.be/${ID}  `],
  ])('accepts %s', (_name, url) => {
    expect(parseYouTube(url)).toEqual({ ok: true, id: ID });
  });

  it('ignores extra params and fragments', () => {
    expect(parseYouTube(`https://www.youtube.com/watch?feature=share&v=${ID}&t=42s`)).toEqual({ ok: true, id: ID });
    expect(parseYouTube(`https://youtu.be/${ID}?si=abc&t=10`)).toEqual({ ok: true, id: ID });
    expect(parseYouTube(`https://www.youtube.com/embed/${ID}?autoplay=1#x`)).toEqual({ ok: true, id: ID });
  });

  it.each([
    ['empty', ''],
    ['other host', 'https://vimeo.com/123456789'],
    ['look-alike host', `https://notyoutube.com/watch?v=${ID}`],
    ['not a url', 'hello world'],
    ['channel page', 'https://www.youtube.com/@somebody'],
    ['missing id', 'https://www.youtube.com/watch'],
    ['short id', 'https://youtu.be/abc'],
    ['bad scheme', `ftp://youtu.be/${ID}`],
  ])('rejects %s', (_name, url) => {
    const r = parseYouTube(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
  });

  it('builds the hqdefault thumbnail', () => {
    expect(youTubeThumbnail(ID)).toBe(`https://img.youtube.com/vi/${ID}/hqdefault.jpg`);
  });
});

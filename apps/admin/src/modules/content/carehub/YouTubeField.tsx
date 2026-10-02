import { useState } from 'react';

import { TextField } from '../../../ui';
import { parseYouTube, youTubeThumbnail } from './youtube';

/** YouTube link input with an immediately rendered thumbnail. */
export function YouTubeField({
  value,
  onChange,
  submitted,
}: {
  value: string;
  onChange: (next: string) => void;
  /** True after a failed save, so an untouched bad value still shows its error. */
  submitted: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const parsed = value.trim() ? parseYouTube(value) : null;
  const error = parsed && !parsed.ok && (touched || submitted) ? parsed.error : null;

  return (
    <>
      <TextField
        label="YouTube link"
        type="url"
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=…"
        value={value}
        error={error}
        hint="watch?v=, youtu.be, /embed/ and /shorts/ links all work. Leave empty for no video."
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      {parsed?.ok && (
        <div className="chCover">
          <img src={youTubeThumbnail(parsed.id)} alt="YouTube video thumbnail" />
        </div>
      )}
    </>
  );
}

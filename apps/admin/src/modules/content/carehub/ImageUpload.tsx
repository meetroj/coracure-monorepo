import { useId, useRef, useState } from 'react';

import { Button } from '../../../ui';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, readAsDataUrl, validateImage } from './image';

/**
 * Cover-image picker: file chooser plus drag-and-drop, with a live preview.
 * UI-only build - the file is read into a data URL and handed to the form;
 * nothing is uploaded.
 */
export function ImageUpload({
  value,
  title,
  onChange,
}: {
  value: string;
  title: string;
  onChange: (dataUrl: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const take = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      // A rejected file never replaces the current cover.
      setError(problem);
      return;
    }
    try {
      onChange(await readAsDataUrl(file));
      setError(null);
    } catch {
      setError('We could not read that file. Try another image.');
    }
  };

  return (
    <div className="formRow">
      <span className="chLabel" id={`${id}-l`}>
        Cover image
      </span>

      {value && (
        <div className="chCover">
          <img src={value} alt={`Cover preview for ${title || 'this item'}`} />
        </div>
      )}

      <label
        className={`chDrop ${over ? 'isOver' : ''}`.trim()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={input}
          type="file"
          className="visuallyHidden"
          aria-label="Cover image file"
          aria-describedby={error ? `${id}-err` : `${id}-hint`}
          accept={IMAGE_TYPES.join(',')}
          onChange={(e) => {
            void take(e.target.files?.[0]);
            // Lets the same file be chosen again after a rejection.
            e.target.value = '';
          }}
        />
        <strong>{value ? 'Replace image' : 'Choose an image'}</strong>
        <span>or drag and drop it here</span>
      </label>

      {value && (
        <div className="row">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange('');
              setError(null);
            }}
          >
            Remove image
          </Button>
        </div>
      )}

      {error ? (
        <p className="fieldError" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : (
        <p className="fieldHint" id={`${id}-hint`}>
          JPG, PNG or WebP, up to {MAX_IMAGE_BYTES / 1024 / 1024} MB. Without a cover, a video's
          thumbnail is used.
        </p>
      )}
    </div>
  );
}

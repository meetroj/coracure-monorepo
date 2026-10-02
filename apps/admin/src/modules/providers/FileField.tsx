import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '../../ui';

/**
 * One file upload with a preview and Replace / Remove.
 *
 * UI-only build: the chosen `File` is held by the form and nothing is sent
 * anywhere. Images preview; a PDF shows its name. A rejected file never
 * replaces the current one.
 */
export function FileField({
  label,
  hint,
  required = false,
  types,
  maxMb,
  file,
  error,
  onChange,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** MIME types accepted. */
  types: string[];
  maxMb: number;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const isImage = file?.type.startsWith('image/') ?? false;
  const url = useMemo(() => (file && isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const take = (next: File | undefined) => {
    if (!next) return;
    if (!types.includes(next.type)) {
      setProblem(`Use ${types.map((t) => t.split('/')[1].toUpperCase()).join(', ')}.`);
      return;
    }
    if (next.size > maxMb * 1024 * 1024) {
      setProblem(`That file is over ${maxMb} MB.`);
      return;
    }
    setProblem(null);
    onChange(next);
  };

  const shown = problem ?? error;

  return (
    <div className="formRow fileField">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>

      {file ? (
        <div className="fileField__chosen">
          {url ? (
            <img src={url} alt={`${label} preview`} className="fileField__thumb" />
          ) : (
            <span className="fileField__name">{file.name}</span>
          )}
          <span className="fileField__actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setProblem(null);
                onChange(null);
              }}
            >
              Remove
            </Button>
          </span>
        </div>
      ) : (
        <Button type="button" variant="secondary" icon="plus" onClick={() => input.current?.click()}>
          Upload
        </Button>
      )}

      <input
        ref={input}
        id={id}
        type="file"
        className="visuallyHidden"
        accept={types.join(',')}
        onChange={(e) => {
          take(e.target.files?.[0]);
          // Lets the same file be chosen again after a rejection.
          e.target.value = '';
        }}
      />

      {shown ? (
        <p className="fieldError" role="alert">
          {shown}
        </p>
      ) : (
        hint && <p className="fieldHint">{hint}</p>
      )}
    </div>
  );
}

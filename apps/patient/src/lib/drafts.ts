import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * SH-03: "Form input survives a backgrounded app and a failed request."
 *
 * A module-level store, deliberately in memory and deliberately NOT on disk.
 *
 * *** WHY NOT AsyncStorage. *** The two forms that most need this are the
 * pre-consult intake and the decline reason, and both are clinical text. Writing
 * them to AsyncStorage would put unencrypted clinical content on disk for any
 * rooted device or ADB backup to read — the same reason `CLAUDE.md` keeps tokens
 * out of it. A draft that survives navigation and backgrounding without ever
 * touching disk is the requirement met at the right cost.
 *
 * What this covers:
 *
 * - **Navigating away and back.** The store outlives the component.
 * - **A failed request.** Nothing is cleared until a write actually succeeds,
 *   so a 500 leaves the form exactly as the user typed it.
 * - **Backgrounding.** React Native keeps the JS context alive when the app is
 *   backgrounded, so module state survives it. The `AppState` subscription below
 *   exists to flush the live component's value into the store at the moment of
 *   backgrounding, so a draft is never lost to a render that had not committed.
 *
 * What it does NOT cover, honestly: the OS killing the process under memory
 * pressure. Surviving that needs encrypted storage, which is a native
 * dependency and a decision about retaining clinical text at rest — worth
 * taking deliberately rather than by accident here.
 */

const drafts = new Map<string, unknown>();

export const readDraft = <T>(key: string): T | undefined => drafts.get(key) as T | undefined;

export const writeDraft = <T>(key: string, value: T): void => {
  drafts.set(key, value);
};

/** Called only once the value has been successfully persisted server-side. */
export const clearDraft = (key: string): void => {
  drafts.delete(key);
};

/** Sign-out must not leave one patient's clinical text for the next. */
export const clearAllDrafts = (): void => {
  drafts.clear();
};

/**
 * `useState`, but the value outlives the screen.
 *
 * Drop-in: `const [answers, setAnswers] = useDraft('intake:abc', {})`.
 */
export const useDraft = <T>(key: string, initial: T): [T, (next: T) => void] => {
  const [value, setValue] = useState<T>(() => readDraft<T>(key) ?? initial);

  // Read inside the AppState handler without re-subscribing on every keystroke.
  const latest = useRef(value);
  latest.current = value;

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeDraft(key, next);
    },
    [key],
  );

  // Flush on background, and on unmount, so nothing in flight is lost.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') writeDraft(key, latest.current);
    });
    return () => {
      writeDraft(key, latest.current);
      sub.remove();
    };
  }, [key]);

  return [value, set];
};

/** Stable draft keys, so two screens cannot collide by accident. */
export const draftKeys = {
  intake: (specialtyId: string) => `intake:${specialtyId}`,
  careMatch: 'care-match',
  assistantQuery: 'assistant:query',
  declineReason: (consultationId: string) => `decline:${consultationId}`,
  cancelReason: (consultationId: string) => `cancel:${consultationId}`,
};

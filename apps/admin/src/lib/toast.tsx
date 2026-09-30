import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, messageFor } from '@coracure/api/errors';

/**
 * Toasts, for the outcome of an action the admin just took.
 *
 * *** A TOAST IS NEVER THE ONLY PLACE AN ERROR APPEARS. *** Field problems
 * belong inline on the field; a failure that leaves a screen unusable belongs
 * in that screen's error state. This is for "it worked", and for the kind of
 * failure the admin can shrug off and retry.
 *
 * `toast.fromError` is the one every mutation should use: it reads the backend
 * `code` (never the message), maps `INSUFFICIENT_PERMISSION` to the sentence
 * §76 asks for, and carries the `requestId` through so support can tie the
 * failure to a backend log line (§54).
 */

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  /** Shown as small print so a screenshot is enough for support. */
  requestId?: string | null;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string, requestId?: string | null) => void;
  info: (message: string) => void;
  /** Turns any thrown value into the right toast. The default for mutations. */
  fromError: (e: unknown, fallback?: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** How long a toast stays. Errors linger — they carry a request id to copy. */
const TTL = { success: 4000, info: 5000, error: 9000 } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, requestId?: string | null) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message, requestId }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TTL[kind]),
      );
    },
    [dismiss],
  );

  // Every pending timer is cleared on unmount, so a toast cannot fire a state
  // update into a component that is gone.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message, requestId) => push('error', message, requestId),
      info: (message) => push('info', message),
      fromError: (e, fallback = 'Something went wrong. Please try again.') => {
        const api = ApiError.of(e);
        // Branch on `code`, never on `message` (§53).
        if (api?.code === 'INSUFFICIENT_PERMISSION' || api?.code === 'FORBIDDEN') {
          push('error', 'You do not have permission to perform this action.', api.requestId);
          return;
        }
        push('error', messageFor(e, fallback), api?.requestId ?? null);
      },
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* `role="status"` + polite: announced without stealing focus. */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`}>
            <span className="toast__icon" aria-hidden="true">
              {toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'i'}
            </span>
            <div className="toast__body">
              <p>{toast.message}</p>
              {toast.requestId && (
                <p className="toast__meta">Request ID: {toast.requestId}</p>
              )}
            </div>
            <button
              className="toast__close"
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

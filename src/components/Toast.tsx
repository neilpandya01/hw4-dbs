"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ToastOptions = { undo?: () => void; /** Seconds on screen. Deletes get longer so Undo isn't missed. */ seconds?: number };
type ToastMessage = ToastOptions & { id: number; text: string };

const ToastContext = createContext<(text: string, undoOrOptions?: (() => void) | ToastOptions) => void>(() => {});

/**
 * Only for changes that can't be reversed with one simple click where you are (moves and deletes).
 * Checking off, adding, and renaming are visible in place, so they get no message.
 * Show a short confirmation, optionally with Undo:
 * `toast("Moved \"Gym\" to Tomorrow", undo)` or `toast("Deleted 5 tasks", { undo, seconds: 10 })`
 */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  // Hovering or focusing the toast holds it open, so nobody loses Undo while reaching for it.
  const [held, setHeld] = useState(false);

  const show = useCallback((text: string, undoOrOptions?: (() => void) | ToastOptions) => {
    const options = typeof undoOrOptions === "function" ? { undo: undoOrOptions } : (undoOrOptions ?? {});
    setToast({ id: Date.now(), text, ...options });
  }, []);

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => setToast(null), (toast.seconds ?? 6) * 1000);
    return () => clearTimeout(timer);
  }, [toast, held]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-bg shadow-lg"
          >
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                className="min-h-8 shrink-0 rounded-md px-2 font-semibold underline underline-offset-2"
                onClick={() => {
                  // The change reverting on screen is the confirmation; no second message.
                  toast.undo?.();
                  setHeld(false);
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss message"
              className="min-h-8 shrink-0 rounded-md px-1.5 opacity-80 hover:opacity-100"
              onClick={() => {
                setHeld(false);
                setToast(null);
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

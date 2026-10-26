"use client";

import { useSaving, useStore } from "@/lib/store";

/**
 * The footer line: whether your list is safely saved. Only claims "Saved" when it is.
 * Not a live region: StorageBanner already announces failures, and "Saving…" on every change would be noise.
 */
export function SaveStatus() {
  const store = useStore();
  const saving = useSaving();
  if (!store) return null;

  const { text, tone } =
    store.storage === "load-failed"
      ? { text: "Couldn't load your account. Changes may not be saved.", tone: "text-warn" }
      : store.storage === "save-failed"
        ? { text: "Not saved: your last change didn't reach your account.", tone: "text-warn" }
        : saving
          ? { text: "Saving…", tone: "text-muted" }
          : { text: "Saved to your account", tone: "text-muted" };

  return (
    <footer className={`mx-auto w-full max-w-xl px-4 pb-6 text-center text-sm ${tone}`}>
      {text}
    </footer>
  );
}

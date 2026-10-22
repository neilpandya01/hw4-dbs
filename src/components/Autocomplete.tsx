"use client";

import { useState, type ComponentProps } from "react";
import type { Task } from "@/lib/store";
import { suggestTitle } from "@/lib/suggest";
import { TextInput } from "./Field";

/** Longer than this and the input starts scrolling, so the grey preview would no longer line up. */
const MAX_PREVIEW = 48;

/**
 * Tab-to-complete for task names. Returns the current suggestion, a way to dismiss it (Esc),
 * and the hint to show under the field so people know Tab does something here.
 */
export function useAutocomplete(value: string, tasks: Task[]) {
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const suggestion = dismissedFor === value ? null : suggestTitle(value, tasks);
  return {
    suggestion,
    dismiss: () => setDismissedFor(value),
    hint: suggestion ? (
      <>
        Press <kbd className="rounded border border-line bg-bg px-1 font-sans text-xs font-semibold text-ink">Tab</kbd> to
        fill in &ldquo;{suggestion}&rdquo;
      </>
    ) : undefined,
  };
}

/**
 * A text input that shows the rest of a suggested task name in grey after what's typed.
 * Tab, or → at the end of the text, accepts it; Esc hides it. With no suggestion, Tab moves focus as usual.
 */
export function AutocompleteInput({
  suggestion,
  onAccept,
  onDismiss,
  wrapperClassName = "",
  value,
  onKeyDown,
  ...props
}: ComponentProps<typeof TextInput> & {
  value: string;
  suggestion: string | null;
  onAccept: (title: string) => void;
  onDismiss: () => void;
  wrapperClassName?: string;
}) {
  const rest = suggestion ? suggestion.slice(value.length) : "";
  const showPreview = !!suggestion && value.length + rest.length <= MAX_PREVIEW;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <TextInput
        {...props}
        value={value}
        className="w-full"
        onKeyDown={(e) => {
          if (suggestion) {
            const atEnd = e.currentTarget.selectionStart === e.currentTarget.value.length;
            if ((e.key === "Tab" && !e.shiftKey) || (e.key === "ArrowRight" && atEnd)) {
              e.preventDefault();
              onAccept(suggestion);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onDismiss();
              return;
            }
          }
          onKeyDown?.(e);
        }}
      />
      {showPreview && (
        // Same box and font as the input: the typed part is invisible, the rest shows in grey.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre rounded-lg border border-transparent px-3 text-base"
        >
          <span className="invisible">{value}</span>
          <span className="text-muted">{rest}</span>
        </div>
      )}
    </div>
  );
}

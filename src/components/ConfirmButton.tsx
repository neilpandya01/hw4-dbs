"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { Button } from "./Button";

/**
 * For actions that remove many things at once: the first press asks inline
 * ("Delete 5 tasks?"), the second does it. Escape or Cancel backs out.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  onConfirm,
  size,
  className,
}: {
  children: React.ReactNode;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const confirm = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asking) confirm.current?.focus();
  }, [asking]);

  // Leaving the page hides it rather than unmounting it; don't come back to a half-asked delete.
  useLayoutEffect(() => () => setAsking(false), []);

  function cancel() {
    setAsking(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  if (!asking) {
    return (
      <Button ref={trigger} variant="danger" size={size} className={className} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={question}
      className={`flex flex-wrap items-center gap-1 rounded-lg bg-bg px-2 py-1 ${className ?? ""}`}
      onKeyDown={(e) => e.key === "Escape" && cancel()}
    >
      <span className="text-sm font-medium text-ink">{question}</span>
      <Button
        ref={confirm}
        variant="danger"
        size="sm"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="secondary" size="sm" onClick={cancel}>
        Cancel
      </Button>
    </div>
  );
}

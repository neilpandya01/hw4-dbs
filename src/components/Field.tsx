import type { ComponentProps, ReactNode } from "react";

type Message = { error?: string; warning?: ReactNode; hint?: ReactNode };

/** The ids an input should point at with aria-describedby. */
export function describedBy(id: string, { error, warning, hint }: Message) {
  return [error && `${id}-error`, warning && `${id}-warning`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
}

/** Label above, input, then any error or warning directly below it. One column, always. */
export function Field({
  id,
  label,
  error,
  warning,
  hint,
  children,
}: Message & { id: string; label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      <div aria-live="polite">
        {error && (
          <p id={`${id}-error`} className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {!error && warning && (
          <div id={`${id}-warning`} className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            {warning}
          </div>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`min-h-11 rounded-lg border bg-surface px-3 text-base text-ink placeholder:text-muted ${
        invalid ? "border-danger" : "border-control"
      } ${className}`}
      {...props}
    />
  );
}

"use client";

/**
 * A row of pill-shaped choices that are real radio buttons underneath (arrow keys work).
 * Styled as options, not actions: smaller than buttons, and the chosen one is tinted with a ✓
 * rather than filled solid, so it never looks like Save or Add.
 */
export function ChoiceChips<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-control bg-surface px-3.5 text-sm text-muted hover:border-accent hover:text-ink peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>.check]:hidden peer-checked:[&>.check]:inline">
            <span aria-hidden="true" className="check">
              ✓
            </span>
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** The error line used under fieldsets, matching Field's. */
export function FieldError({ id, error }: { id: string; error?: string }) {
  return (
    <div aria-live="polite">
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

import type { ReactNode } from "react";

/** Every page names where you are: "Today · Sun, Oct 19". */
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      {children}
    </header>
  );
}

export function Section({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Never a dead end: an empty screen always says what to do next. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="flex flex-wrap justify-center gap-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Shown while saved tasks load, so the page never flashes "empty" first. */
export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your tasks" className="flex flex-col gap-3">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}

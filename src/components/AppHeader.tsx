"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { formatTime } from "@/lib/dates";
import { isNewUser, useStore, wrapUpTime } from "@/lib/store";
import { buttonClass } from "./Button";
import { WrapUpEditor } from "./WrapUpSetting";

/**
 * App-level details, in three bands with at most two things each:
 *   ┌ ☾ Your day wraps up at 6 PM · Change ┐   (thin strip, scrolls away)
 *   │ Dayplan                [+ Add task]  │   (pinned)
 *   └ Today  At a Glance  Calendar  Done   ┘   (pinned)
 * The wrap-up time applies to every day, so it lives up here rather than on a single day.
 * Hidden until onboarding is finished, and while saved data loads, so a new person never sees it flash.
 */
export function AppHeader({ nav }: { nav: ReactNode }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const wrapUpButton = useRef<HTMLButtonElement>(null);
  if (!store || isNewUser(store.data)) return null;

  const time = formatTime(wrapUpTime(store.data));

  return (
    <>
      <div className="border-b border-line bg-accent-soft">
        <div className="mx-auto flex w-full max-w-xl justify-center px-4">
          <button
            ref={wrapUpButton}
            type="button"
            aria-expanded={editing}
            aria-controls="wrap-up-editor"
            aria-label={`Your day wraps up at ${time}. ${editing ? "Close" : "Change"}`}
            onClick={() => setEditing((e) => !e)}
            className="inline-flex min-h-9 items-center gap-1.5 text-sm text-ink"
          >
            <MoonIcon />
            <span>
              Your day wraps up at <span className="font-semibold">{time}</span>
            </span>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="font-medium text-accent underline underline-offset-2">{editing ? "Close" : "Change"}</span>
          </button>
        </div>
        {editing && (
          <div className="border-t border-line bg-bg">
            <div className="mx-auto w-full max-w-xl px-4">
              <WrapUpEditor
                current={wrapUpTime(store.data)}
                onClose={() => {
                  setEditing(false);
                  requestAnimationFrame(() => wrapUpButton.current?.focus());
                }}
              />
            </div>
          </div>
        )}
      </div>

      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl flex-col px-4">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
              Dayplan
            </Link>
            <Link href="/add" className={`${buttonClass()} shrink-0`}>
              + Add task
            </Link>
          </div>
          {nav}
        </div>
      </header>
    </>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 text-accent" fill="currentColor">
      <path d="M17.3 12.6A7.5 7.5 0 0 1 7.4 2.7a7.5 7.5 0 1 0 9.9 9.9Z" />
    </svg>
  );
}

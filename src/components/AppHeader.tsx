"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatTime } from "@/lib/dates";
import { isNewUser, useStore, wrapUpTime } from "@/lib/store";
import { useWeatherSettings, type SettingsState } from "@/lib/weatherSettings";
import { buttonClass } from "./Button";
import { WeatherSetup } from "./WeatherSetup";
import { WrapUpEditor } from "./WrapUpSetting";

/**
 * App-level details, in three bands with at most two things each:
 *   ┌ ☾ Wraps up at 6 PM · Change   ☁ Weather: Chicago · Change ┐   (thin strip, scrolls away)
 *   │ Dayplan                               [+ Add task]  │   (pinned)
 *   └ Today  At a Glance  Calendar  Done                  ┘   (pinned)
 * The wrap-up time and the weather choice apply to every day, so they live up here rather than
 * on a single day. Each opens its editor under the strip, one at a time.
 * Hidden while saved data loads. During onboarding only the name and account menu show,
 * so someone new can still sign out.
 */
export function AppHeader({ nav }: { nav: ReactNode }) {
  const store = useStore();
  const [editing, setEditing] = useState<null | "wrap-up" | "weather">(null);
  const wrapUpButton = useRef<HTMLButtonElement>(null);
  const weatherButton = useRef<HTMLButtonElement>(null);
  const weather = useWeatherSettings();
  if (!store) return null;
  if (isNewUser(store)) {
    return (
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex min-h-16 w-full max-w-xl items-center justify-between gap-4 px-4">
          <span className="text-xl font-semibold tracking-tight text-ink">Dayplan</span>
          <UserButton />
        </div>
      </header>
    );
  }

  const time = formatTime(wrapUpTime(store.data));
  const place = weatherLabel(weather);

  function close(button: HTMLButtonElement | null) {
    setEditing(null);
    requestAnimationFrame(() => button?.focus());
  }

  return (
    <>
      <div className="border-b border-line bg-accent-soft">
        <div className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-x-5 px-4">
          <button
            ref={wrapUpButton}
            type="button"
            aria-expanded={editing === "wrap-up"}
            aria-controls="wrap-up-editor"
            aria-label={`Your day wraps up at ${time}. ${editing === "wrap-up" ? "Close" : "Change"}`}
            onClick={() => setEditing((e) => (e === "wrap-up" ? null : "wrap-up"))}
            className="inline-flex min-h-9 items-center gap-1.5 text-sm text-ink"
          >
            <MoonIcon />
            <span>
              Wraps up at <span className="font-semibold">{time}</span>
            </span>
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span className="font-medium text-accent underline underline-offset-2">
              {editing === "wrap-up" ? "Close" : "Change"}
            </span>
          </button>
          {place && (
            <button
              ref={weatherButton}
              type="button"
              aria-expanded={editing === "weather"}
              aria-controls="weather-editor"
              aria-label={`Weather: ${place}. ${editing === "weather" ? "Close" : "Change"}`}
              onClick={() => setEditing((e) => (e === "weather" ? null : "weather"))}
              className="inline-flex min-h-9 min-w-0 items-center gap-1.5 text-sm text-ink"
            >
              <CloudIcon />
              <span className="truncate">
                Weather: <span className="font-semibold">{place}</span>
              </span>
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
              <span className="font-medium text-accent underline underline-offset-2">
                {editing === "weather" ? "Close" : "Change"}
              </span>
            </button>
          )}
        </div>
        {editing === "wrap-up" && (
          <div className="border-t border-line bg-bg">
            <div className="mx-auto w-full max-w-xl px-4">
              <WrapUpEditor current={wrapUpTime(store.data)} onClose={() => close(wrapUpButton.current)} />
            </div>
          </div>
        )}
        {editing === "weather" && place && (
          <div id="weather-editor" className="border-t border-line bg-bg">
            <div className="mx-auto w-full max-w-xl px-4">
              <WeatherEditor onClose={() => close(weatherButton.current)} />
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
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/add" className={buttonClass()}>
                + Add task
              </Link>
              <UserButton />
            </div>
          </div>
          {nav}
        </div>
      </header>
    </>
  );
}

/** The strip's short label for the weather choice, or null while it's loading or unreachable. */
function weatherLabel(state: SettingsState): string | null {
  if (state.status !== "ready") return null;
  const { mode, placeName } = state.settings;
  if (mode === "location") return "Your location";
  if (mode === "place") return placeName?.split(",")[0] ?? "Saved city";
  if (mode === "off") return "Off";
  return "Not set";
}

/** The weather choice, changeable any time. Focus starts on the heading so the current choice is read first. */
function WeatherEditor({ onClose }: { onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return <WeatherSetup variant="settings" headingRef={heading} onDone={onClose} onCancel={onClose} />;
}

function CloudIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 text-accent" fill="currentColor">
      <path d="M6 16a4 4 0 0 1-.6-7.96A5 5 0 0 1 15.2 7.1 3.5 3.5 0 0 1 14.5 16H6Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 text-accent" fill="currentColor">
      <path d="M17.3 12.6A7.5 7.5 0 0 1 7.4 2.7a7.5 7.5 0 1 0 9.9 9.9Z" />
    </svg>
  );
}

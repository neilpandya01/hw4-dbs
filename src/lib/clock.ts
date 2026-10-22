"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "./dates";

// The current day and minute. It ticks right on each minute boundary, so the wrap-up
// card appears at the wrap-up time exactly and the list rolls over at midnight,
// without a reload. Returning to the tab re-reads it at once, since browsers slow
// down timers in background tabs.

function subscribe(listener: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    listener();
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20); // +20ms: land just past :00
  };
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);

  const onVisible = () => document.visibilityState === "visible" && listener();
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function getSnapshot(): string {
  const now = new Date();
  return `${todayKey()}|${now.getHours() * 60 + now.getMinutes()}`;
}

export type Clock = { today: string; minutes: number };

/** null on the server: the date depends on the visitor's own time zone. */
export function useClock(): Clock | null {
  const value = useSyncExternalStore<string | null>(subscribe, getSnapshot, () => null);
  if (!value) return null;
  const [today, minutes] = value.split("|");
  return { today, minutes: Number(minutes) };
}

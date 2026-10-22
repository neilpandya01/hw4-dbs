"use client";

import { useEffect } from "react";
import { useClock } from "@/lib/clock";
import { rollOver, useStore } from "@/lib/store";

/**
 * Runs the daily rollover: on first load, and again the moment the date changes
 * (the clock ticks on the minute), unfinished tasks from earlier days move onto today
 * as rolled over. Renders nothing.
 */
export function DayRollover() {
  const today = useClock()?.today;
  const loaded = useStore() !== null;

  useEffect(() => {
    if (today && loaded) rollOver(today);
  }, [today, loaded]);

  return null;
}

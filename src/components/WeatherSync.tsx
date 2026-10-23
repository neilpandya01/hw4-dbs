"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { checkForecast } from "@/lib/forecast";
import { useWeatherSettings } from "@/lib/weatherSettings";

/** How often to look at the clock; a fetch only happens once the forecast is 30+ minutes old. */
const CHECK_EVERY_MS = 5 * 60_000;

/**
 * Keeps weather current without asking the API too often. Renders nothing.
 *   - Settings are loaded by AccountSync; this only decides when to refresh the forecast.
 *   - Checks the forecast on app open, on every page switch, on returning to the tab, and every
 *     5 minutes; checkForecast only fetches when the forecast is stale (see src/lib/forecast.ts).
 * Reads the URL, so the layout wraps it in Suspense.
 */
export function WeatherSync() {
  const settingsState = useWeatherSettings();
  const settings = settingsState.status === "ready" ? settingsState.settings : null;
  const pathname = usePathname();

  // App open, a page switch, or a changed setting.
  useEffect(() => {
    if (!document.hidden) void checkForecast(settings);
  }, [settings, pathname]);

  // Every few minutes while visible, and right away on coming back to the tab.
  useEffect(() => {
    const check = () => {
      if (!document.hidden) void checkForecast(settings);
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [settings]);

  return null;
}

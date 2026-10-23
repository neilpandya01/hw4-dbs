"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { checkForecast, resetForecast } from "@/lib/forecast";
import { setTokenSource } from "@/lib/supabase";
import { loadWeatherSettings, useWeatherSettings } from "@/lib/weatherSettings";

/** How often to look at the clock; a fetch only happens once the forecast is 30+ minutes old. */
const CHECK_EVERY_MS = 5 * 60_000;

/**
 * Keeps weather current without asking the API too often. Renders nothing.
 *   - Hands Clerk's session token to Supabase, then loads this person's weather settings.
 *   - Checks the forecast on app open, on every page switch, on returning to the tab, and every
 *     5 minutes; checkForecast only fetches when the forecast is stale (see src/lib/forecast.ts).
 * Reads the URL, so the layout wraps it in Suspense.
 */
export function WeatherSync() {
  const { isLoaded, userId, getToken } = useAuth();
  const settingsState = useWeatherSettings();
  const settings = settingsState.status === "ready" ? settingsState.settings : null;
  const pathname = usePathname();
  // Always ask Clerk for a fresh token; held in a ref so a new function identity doesn't reload settings.
  const tokenFn = useRef(getToken);
  useEffect(() => {
    tokenFn.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    setTokenSource(userId ? () => tokenFn.current() : null);
    void loadWeatherSettings(userId ?? null);
    return () => {
      // Signed out (or switched people): forget their weather and location.
      setTokenSource(null);
      void loadWeatherSettings(null);
      resetForecast();
    };
  }, [isLoaded, userId]);

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

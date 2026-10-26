"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { resetForecast } from "@/lib/forecast";
import { loadStore, refreshStore } from "@/lib/store";
import { setTokenSource } from "@/lib/supabase";
import { loadWeatherSettings } from "@/lib/weatherSettings";

/**
 * Connects the signed-in Clerk user to their data. Renders nothing.
 *   - Hands Clerk's session token to Supabase, so row-level security knows who is asking.
 *   - Loads this person's tasks, settings, and weather choice; forgets them all on sign-out.
 *   - On returning to the tab, picks up changes made on another device.
 */
export function AccountSync() {
  const { isLoaded, userId, getToken } = useAuth();
  // Always ask Clerk for a fresh token; held in a ref so a new function identity doesn't reload everything.
  const tokenFn = useRef(getToken);
  useEffect(() => {
    tokenFn.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    setTokenSource(userId ? () => tokenFn.current() : null);
    void loadStore(userId ?? null);
    void loadWeatherSettings(userId ?? null);
    return () => {
      // Signed out (or switched people): nobody else should see their list, weather, or location.
      setTokenSource(null);
      void loadStore(null);
      void loadWeatherSettings(null);
      resetForecast();
    };
  }, [isLoaded, userId]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void refreshStore();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return null;
}

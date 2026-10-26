"use client";

import { useSyncExternalStore } from "react";
import { fetchForecast, type Forecast } from "./weather";
import { roundCoord, saveWeatherSettings, type WeatherSettings } from "./weatherSettings";

// The one shared forecast every view reads. Not saved anywhere: it's fetched again when stale.
//
// When it's fetched (see WeatherSync, which calls refreshForecast):
//   - when the app opens;
//   - on a page switch, on returning to the tab, and on a timer every few minutes,
//     but only if the forecast is at least 30 minutes old (Open-Meteo updates about hourly);
//   - never while the tab is in the background;
//   - after a failed call, not again for 5 minutes: no retry loops against the API.

const FRESH_MS = 30 * 60_000;
const RETRY_MS = 5 * 60_000;

export type ForecastState = {
  /** idle: weather off or not set up. no-location: "use my location", but this device hasn't shared it and nothing is saved. */
  status: "idle" | "no-location" | "loading" | "ready" | "error";
  /** The last good forecast, kept through a failed refresh so the page doesn't go blank. */
  forecast: Forecast | null;
  /** Where the forecast is for (rounded to 2 decimals), while there is one or it's loading. */
  coords?: { lat: number; lon: number } | null;
};

const IDLE: ForecastState = { status: "idle", forecast: null };
let state: ForecastState = IDLE;
let place: string | null = null; // "lat,lon" the forecast is for
let fetchedAt = 0;
let failedAt = 0;
let inFlight: AbortController | null = null;
const listeners = new Set<() => void>();

function set(next: ForecastState) {
  const at = place && next.status !== "idle" && next.status !== "no-location" ? place.split(",").map(Number) : null;
  state = { ...next, coords: at ? { lat: at[0], lon: at[1] } : null };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useForecastState(): ForecastState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}

/** Forget everything, e.g. on sign-out, so the next person never sees someone else's weather. */
export function resetForecast() {
  inFlight?.abort();
  inFlight = null;
  place = null;
  fetchedAt = failedAt = 0;
  set(IDLE);
}

/** Fetch if the forecast is missing, stale, or for a different place. Cheap to call often. */
async function refresh(lat: number, lon: number) {
  const key = `${lat},${lon}`;
  if (key !== place) {
    // A new place: the old forecast doesn't apply, start over.
    inFlight?.abort();
    inFlight = null;
    place = key;
    fetchedAt = failedAt = 0;
    set({ status: "loading", forecast: null });
  }
  const now = Date.now();
  if (inFlight || now - fetchedAt < FRESH_MS || now - failedAt < RETRY_MS) return;

  const controller = new AbortController();
  inFlight = controller;
  if (!state.forecast) set({ status: "loading", forecast: null });
  try {
    const forecast = await fetchForecast(lat, lon, controller.signal);
    if (inFlight !== controller) return; // replaced by a newer place or a sign-out
    fetchedAt = Date.now();
    set({ status: "ready", forecast });
  } catch {
    if (inFlight !== controller) return;
    failedAt = Date.now();
    set({ status: "error", forecast: state.forecast });
  } finally {
    if (inFlight === controller) inFlight = null;
  }
}

/** Ask the browser for this device's position without prompting: only if access was already granted. */
async function devicePosition(): Promise<{ lat: number; lon: number } | null> {
  if (!("geolocation" in navigator)) return null;
  try {
    const permission = await navigator.permissions?.query({ name: "geolocation" });
    if (permission?.state !== "granted") return null;
  } catch {
    return null;
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: roundCoord(p.coords.latitude), lon: roundCoord(p.coords.longitude) }),
      () => resolve(null),
      { maximumAge: FRESH_MS, timeout: 10_000 },
    ),
  );
}

/**
 * Work out where to get weather for, then refresh if needed.
 *   place:    the saved city.
 *   location: this device's position if it has been shared; otherwise the saved coordinates.
 *             A new position is saved (rounded) so other devices have a fallback.
 */
export async function checkForecast(settings: WeatherSettings | null) {
  if (!settings || settings.mode === null || settings.mode === "off") {
    if (state.status !== "idle") resetForecast();
    return;
  }
  if (settings.mode === "place") {
    if (settings.lat !== null && settings.lon !== null) return refresh(settings.lat, settings.lon);
    return set({ status: "no-location", forecast: null });
  }
  const device = await devicePosition();
  if (device) {
    if (device.lat !== settings.lat || device.lon !== settings.lon) {
      void saveWeatherSettings({ ...settings, lat: device.lat, lon: device.lon });
    }
    return refresh(device.lat, device.lon);
  }
  if (settings.lat !== null && settings.lon !== null) return refresh(settings.lat, settings.lon);
  set({ status: "no-location", forecast: null });
}

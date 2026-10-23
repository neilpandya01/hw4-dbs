"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

// Where each person wants their weather from, saved in Supabase (user_settings, one row per person).
// Loaded once per signed-in user and shared by every view through useWeatherSettings().

export type WeatherMode = "location" | "place" | "off";

export type WeatherSettings = {
  /** null: never asked (onboarded before the weather step existed). */
  mode: WeatherMode | null;
  lat: number | null;
  lon: number | null;
  /** A searched city's label, e.g. "Chicago, Illinois". null for "location". */
  placeName: string | null;
};

export type SettingsState =
  | { status: "loading" }
  | { status: "ready"; settings: WeatherSettings }
  | { status: "error"; message: string };

const NOT_CONFIGURED = "Weather settings can't load: Supabase isn't set up for this app yet.";
const LOAD_FAILED = "Couldn't load your weather settings. Check your connection, then reload the page.";

let userId: string | null = null;
let state: SettingsState = { status: "loading" };
const listeners = new Set<() => void>();

function set(next: SettingsState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWeatherSettings(): SettingsState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Store coordinates rounded to 2 decimals (about 1 km), never an exact position. */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Called when the signed-in person changes (or signs out, with null). */
export async function loadWeatherSettings(id: string | null) {
  if (id === userId) return;
  userId = id;
  if (!id) return set({ status: "loading" });
  const db = supabase();
  if (!db) return set({ status: "error", message: NOT_CONFIGURED });
  set({ status: "loading" });
  const { data, error } = await db
    .from("user_settings")
    .select("weather_mode, weather_lat, weather_lon, weather_place_name")
    .maybeSingle();
  if (userId !== id) return; // signed out or switched while loading
  if (error) return set({ status: "error", message: LOAD_FAILED });
  set({
    status: "ready",
    settings: {
      mode: (data?.weather_mode as WeatherMode | null) ?? null,
      lat: data?.weather_lat ?? null,
      lon: data?.weather_lon ?? null,
      placeName: data?.weather_place_name ?? null,
    },
  });
}

/**
 * Save a weather choice. Creates the person's settings row the first time.
 * Returns an error message to show under the field, or null when saved.
 */
export async function saveWeatherSettings(next: WeatherSettings): Promise<string | null> {
  const db = supabase();
  if (!db) return NOT_CONFIGURED;
  if (!userId) return "You're signed out. Sign in again to save this.";
  const { error } = await db.from("user_settings").upsert(
    {
      user_id: userId,
      weather_mode: next.mode,
      weather_lat: next.lat === null ? null : roundCoord(next.lat),
      weather_lon: next.lon === null ? null : roundCoord(next.lon),
      weather_place_name: next.placeName,
    },
    { onConflict: "user_id" },
  );
  if (error) return "Couldn't save your choice. Check your connection and try again.";
  set({
    status: "ready",
    settings: {
      ...next,
      lat: next.lat === null ? null : roundCoord(next.lat),
      lon: next.lon === null ? null : roundCoord(next.lon),
    },
  });
  return null;
}

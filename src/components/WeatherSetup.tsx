"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { searchPlaces, type Place } from "@/lib/weather";
import { saveWeatherSettings, useWeatherSettings, type WeatherSettings } from "@/lib/weatherSettings";
import { Button } from "./Button";
import { describedBy, Field, TextInput } from "./Field";

const HOUR = 60 * 60_000;
/** Give up on finding the device's position after this long, and offer city search instead. */
const LOCATE_TIMEOUT_MS = 10_000;

/**
 * Where should weather come from? Asked in this order:
 *   1. "Use my location": the browser asks; on yes, save it (rounded to about 1 km).
 *   2. Location refused or unavailable (or "Pick a city instead"): search for a city and pick one.
 *   3. No weather at all ("Skip weather", offered right away and after a refused location): saved as off,
 *      so we don't ask again and the weather card and chips stay hidden.
 * Used as an onboarding step, inside the Today weather card for anyone who hasn't chosen yet,
 * and as the header's weather setting ("settings"), where you can change or turn off your choice any time.
 */
export function WeatherSetup({
  variant,
  headingRef,
  onDone,
  onBack,
  onCancel,
}: {
  variant: "onboarding" | "card" | "settings";
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onDone?: () => void;
  onBack?: () => void;
  /** Settings only: close without changing anything (Cancel button and Escape). */
  onCancel?: () => void;
}) {
  const settings = useWeatherSettings();
  const [phase, setPhase] = useState<"ask" | "city">("ask");
  const [busy, setBusy] = useState<null | "locating" | "searching" | "saving">(null);
  const [why, setWhy] = useState<string | null>(null); // why we're asking for a city
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Pages you leave are hidden, not unmounted: never come back to a stuck "Finding you…".
  useLayoutEffect(() => () => setBusy(null), []);

  async function save(next: WeatherSettings) {
    setBusy("saving");
    setSaveError(null);
    const error = await saveWeatherSettings(next);
    setBusy(null);
    if (error) setSaveError(error);
    else onDone?.();
  }

  function askForCity(reason: string | null) {
    setWhy(reason);
    setPhase("city");
    setSaveError(null);
    // Let the field render, then put the cursor in it.
    requestAnimationFrame(() => input.current?.focus());
  }

  function shareLocation() {
    if (!("geolocation" in navigator)) return askForCity("This browser can't share a location. Search for a city instead.");
    setBusy("locating");
    setSaveError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => void save({ mode: "location", lat: p.coords.latitude, lon: p.coords.longitude, placeName: null }),
      (e) => {
        setBusy(null);
        askForCity(
          e.code === e.PERMISSION_DENIED
            ? "Location is off for Dayplan. Search for your city instead."
            : "Couldn't find your location. Search for your city instead.",
        );
      },
      { timeout: LOCATE_TIMEOUT_MS, maximumAge: HOUR },
    );
  }

  async function search() {
    const name = query.trim();
    setResults(null);
    if (name.length < 2) return setFieldError("Type a city name, like Chicago.");
    setFieldError(null);
    setBusy("searching");
    try {
      const places = await searchPlaces(name);
      setResults(places);
      if (places.length === 0) setFieldError(`No places match "${name}". Check the spelling, or try a nearby larger city.`);
    } catch {
      setFieldError("City search isn't working right now. Try again in a minute, or skip weather for now.");
    } finally {
      setBusy(null);
    }
  }

  const loadError = settings.status === "error" ? settings.message : null;
  const current = settings.status === "ready" ? settings.settings : null;
  // Coming Back to this step after choosing: offer to keep that choice.
  const currentLabel = current?.mode === "location" ? "your location" : current?.mode === "place" ? current.placeName : null;
  const big = variant === "onboarding";
  const isSettings = variant === "settings";
  // Today's card and the header setting can both be on screen: keep their ids apart.
  const cityId = `${variant}-weather-city`;
  const nowShowing =
    current?.mode === "location"
      ? "Now showing weather for your location."
      : current?.mode === "place"
        ? `Now showing weather for ${current.placeName ?? "your saved city"}.`
        : current?.mode === "off"
          ? "Weather is off."
          : null;

  return (
    <div
      className={`flex flex-col ${isSettings ? "gap-4 py-4" : "gap-6"}`}
      onKeyDown={(e) => {
        if (isSettings && e.key === "Escape" && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <section className={`flex flex-col gap-4 ${big ? "rounded-2xl border border-line bg-surface p-5" : ""}`}>
        <div className="flex flex-col gap-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={`${big ? "text-2xl" : isSettings ? "text-base" : "text-lg"} font-semibold tracking-tight text-ink outline-none`}
          >
            {phase === "city" ? "Which city's weather?" : isSettings ? "Weather" : "Show the weather for your day?"}
          </h2>
          {isSettings && phase === "ask" && nowShowing && <p className="text-sm text-ink">{nowShowing}</p>}
          <p className="text-sm text-muted">
            {phase === "ask"
              ? "Dayplan shows today's forecast and the week ahead next to your tasks. Your location is rounded to about 1 km and only used for weather."
              : (why ?? "Pick the city whose weather you want to see.")}
          </p>
        </div>

        {loadError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {loadError}
          </p>
        )}

        {phase === "ask" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={shareLocation} disabled={!!busy || !!loadError} aria-busy={busy === "locating"}>
              {busy === "locating" && <Spinner />}
              {busy === "locating" ? "Finding you…" : busy === "saving" ? "Saving…" : "Use my location"}
            </Button>
            <Button variant="secondary" onClick={() => askForCity(null)} disabled={!!busy || !!loadError}>
              {isSettings ? "Pick a city" : "Pick a city instead"}
            </Button>
            {isSettings && current?.mode !== "off" && (
              <Button
                variant="secondary"
                disabled={!!busy || !!loadError}
                onClick={() => void save({ mode: "off", lat: null, lon: null, placeName: null })}
              >
                Turn weather off
              </Button>
            )}
            {!isSettings && currentLabel && onDone && (
              <Button variant="ghost" onClick={onDone} disabled={!!busy}>
                Keep {currentLabel}
              </Button>
            )}
          </div>
        )}

        {/* While the browser looks for the position, say so plainly (it can take up to 10 seconds). */}
        <div role="status" aria-live="polite">
          {busy === "locating" && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <Spinner />
              Finding your location… This can take up to 10 seconds.
            </p>
          )}
        </div>

        {phase === "city" && (
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <Field id={cityId} label="City" error={fieldError ?? undefined}>
              <div className="flex gap-2">
                <TextInput
                  ref={input}
                  id={cityId}
                  className="min-w-0 flex-1"
                  value={query}
                  autoComplete="address-level2"
                  placeholder="e.g. Chicago"
                  invalid={!!fieldError}
                  aria-describedby={describedBy(cityId, { error: fieldError ?? undefined })}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                />
                <Button type="submit" variant="secondary" disabled={!!busy}>
                  {busy === "searching" ? "Searching…" : "Search"}
                </Button>
              </div>
            </Field>

            {results && results.length > 0 && (
              <ul aria-label="Matching places" className="flex flex-col gap-2">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void save({ mode: "place", lat: p.lat, lon: p.lon, placeName: p.label })}
                      className="flex w-full flex-col items-start rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-control disabled:opacity-50"
                    >
                      <span className="font-medium text-ink">{p.label.split(",")[0]}</span>
                      {p.detail && <span className="text-sm text-muted">{p.detail}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}

        <div aria-live="polite">
          {saveError && <p className="text-sm font-medium text-danger">{saveError}</p>}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {phase === "city" && (
          <Button variant="secondary" onClick={() => setPhase("ask")} disabled={!!busy}>
            Back
          </Button>
        )}
        {phase === "ask" && onBack && (
          <Button variant="secondary" onClick={onBack} disabled={!!busy}>
            Back
          </Button>
        )}
        {isSettings && onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy === "saving"}>
            Cancel
          </Button>
        )}
        {isSettings ? null : loadError && onDone ? (
          // Settings can't be reached: don't trap someone in onboarding over weather.
          <Button variant="ghost" onClick={onDone}>
            Continue without weather
          </Button>
        ) : (
          // Weather is optional: skipping saves "off" without asking for a location or a city.
          <Button
            variant="ghost"
            disabled={!!busy}
            onClick={() => void save({ mode: "off", lat: null, lon: null, placeName: null })}
          >
            Skip weather
          </Button>
        )}
      </div>
    </div>
  );
}

/** A small spinning ring for "working on it". Stops spinning for people who prefer reduced motion. */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import { useForecastState } from "@/lib/forecast";
import { dayForecast, formatHour, skyFor, skyLabel, type DayForecast, type Forecast, type Sky } from "@/lib/weather";
import { useWeatherSettings } from "@/lib/weatherSettings";
import { WeatherIcon } from "./WeatherIcon";
import { WeatherSetup } from "./WeatherSetup";

/** The current forecast, or null while there isn't one (loading, off, or unavailable). */
export function useForecast(): Forecast | null {
  return useForecastState().forecast;
}

/** The card's soft tint follows the sky: warm for sun, blue for rain, grey for clouds. */
const TINT: Record<Sky, string> = {
  clear: "var(--wx-sun)",
  "clear-night": "var(--wx-moon)",
  partly: "var(--wx-sun)",
  "partly-night": "var(--wx-moon)",
  cloudy: "var(--wx-cloud-edge)",
  fog: "var(--wx-cloud-edge)",
  drizzle: "var(--wx-rain)",
  rain: "var(--wx-rain)",
  snow: "var(--wx-snow)",
  storm: "var(--wx-cloud-dark)",
};

function rainNote(day: DayForecast): string {
  return day.precipChance >= 30 ? `${day.precipChance}% chance of ${skyFor(day.code) === "snow" ? "snow" : "rain"}` : "Dry today";
}

/** A plain card for the weather's other states: loading, unavailable, not set up. */
function WeatherNote({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Weather" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      {children}
    </section>
  );
}

/**
 * Today's page: right now, today's high and low, and the next few hours.
 * Also every other state: loading, not set up yet, location needed, and the API being down.
 * Weather turned off shows nothing at all.
 */
export function WeatherToday({ today }: { today: string }) {
  const settingsState = useWeatherSettings();
  const { status, forecast } = useForecastState();

  if (settingsState.status === "error") {
    return (
      <WeatherNote>
        <p className="text-sm text-muted">{settingsState.message}</p>
      </WeatherNote>
    );
  }
  if (settingsState.status === "loading") return <WeatherSkeleton />;
  const settings = settingsState.settings;
  if (settings.mode === "off") return null;
  if (settings.mode === null) {
    // Onboarded before weather existed: ask here, once.
    return (
      <WeatherNote>
        <WeatherSetup variant="card" />
      </WeatherNote>
    );
  }
  if (status === "no-location") {
    return (
      <WeatherNote>
        <WeatherSetup variant="card" />
      </WeatherNote>
    );
  }
  if (!forecast) {
    if (status === "error") {
      return (
        <WeatherNote>
          <div className="flex items-center gap-3">
            <WeatherIcon sky="cloudy" size={40} />
            <div>
              <p className="font-medium text-ink">Weather is unavailable right now</p>
              <p className="text-sm text-muted">Your tasks are fine. Dayplan will try again in a few minutes.</p>
            </div>
          </div>
        </WeatherNote>
      );
    }
    return <WeatherSkeleton />;
  }

  // A place in another time zone may not have "today" yet or anymore: use its first day.
  const day = dayForecast(forecast, today) ?? forecast.days[0];
  const sky = skyFor(forecast.current.code, forecast.current.night);
  const place = settings.mode === "place" ? (settings.placeName ?? "Saved city") : "Your location";
  const style = {
    background: `linear-gradient(135deg, color-mix(in oklab, ${TINT[sky]} 22%, var(--surface)) 0%, var(--surface) 75%)`,
  } satisfies CSSProperties;

  return (
    <section aria-label="Weather" style={style} className="flex flex-col gap-4 rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <PinIcon />
          {place}
        </span>
        {status === "error" && <span className="text-xs">Couldn&apos;t refresh. Showing the last forecast.</span>}
      </div>

      <div className="flex items-center gap-4">
        <WeatherIcon sky={sky} size={84} animated />
        <div className="flex flex-col">
          <p className="text-5xl font-light tracking-tight text-ink">
            {forecast.current.temp}°<span className="sr-only">F</span>
          </p>
          <p className="font-medium text-ink">{skyLabel(sky)}</p>
        </div>
        {day && (
          <div className="ml-auto flex flex-col items-end gap-0.5 text-right text-sm text-muted">
            <p>
              <span aria-hidden="true">H </span>
              <span className="sr-only">High </span>
              <span className="font-medium text-ink">{day.high}°</span>
              <span aria-hidden="true"> · L </span>
              <span className="sr-only">, low </span>
              {day.low}°
            </p>
            <p>Feels like {forecast.current.feelsLike}°</p>
            <p>{rainNote(day)}</p>
          </div>
        )}
      </div>

      <ol aria-label="Next hours" className="grid grid-cols-5 gap-1 border-t border-line pt-3">
        {forecast.hours.map((h) => {
          const hourSky = skyFor(h.code, h.night);
          return (
            <li key={h.minutes} className="flex flex-col items-center gap-1 text-sm">
              <span className="text-muted">{formatHour(h.minutes)}</span>
              <WeatherIcon sky={hourSky} size={28} />
              <span className="sr-only">{skyLabel(hourSky)}, </span>
              <span className="font-medium text-ink">{h.temp}°</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** At a Glance: one line per day — icon, high/low, and rain only when it's likely. */
export function WeatherChip({ day }: { day: DayForecast }) {
  const sky = skyFor(day.code);
  const wet = day.precipChance >= 30;
  return (
    <span className="flex items-center gap-1.5 text-sm font-normal tracking-normal normal-case">
      <span className="sr-only">
        {skyLabel(sky)}, high {day.high}°, low {day.low}°{wet ? `, ${day.precipChance}% chance of precipitation` : ""}
      </span>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <WeatherIcon sky={sky} size={20} />
        <span className="text-ink">{day.high}°</span>
        <span className="text-muted">{day.low}°</span>
        {wet && (
          <span className="flex items-center gap-0.5 text-muted">
            <DropIcon />
            {day.precipChance}%
          </span>
        )}
      </span>
    </span>
  );
}

function WeatherSkeleton() {
  return <div aria-busy="true" aria-label="Loading weather" className="h-44 animate-pulse rounded-2xl bg-surface" />;
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
      <path d="M5 0.5 C5 0.5 0.8 5.3 0.8 7.6 A4.2 4.2 0 0 0 9.2 7.6 C9.2 5.3 5 0.5 5 0.5 Z" fill="var(--wx-rain)" />
    </svg>
  );
}

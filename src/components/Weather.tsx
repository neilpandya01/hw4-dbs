"use client";

import type { CSSProperties } from "react";
import { useClock } from "@/lib/clock";
import {
  dayForecast,
  formatHour,
  isNight,
  sampleForecast,
  skyFor,
  skyLabel,
  type DayForecast,
  type Forecast,
  type Sky,
} from "@/lib/weather";
import { WeatherIcon } from "./WeatherIcon";

/**
 * The forecast every weather view reads. PLACEHOLDER: returns sample data until the
 * Open-Meteo call is built; only this hook changes then.
 */
export function useForecast(): Forecast | null {
  const clock = useClock();
  return clock ? sampleForecast(clock.today, clock.minutes) : null;
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

/** Today's page: right now, today's high and low, and the next few hours. */
export function WeatherToday({ today, minutes }: { today: string; minutes: number }) {
  const forecast = useForecast();
  if (!forecast) return <div aria-hidden="true" className="h-44 animate-pulse rounded-2xl bg-surface" />;

  const day = dayForecast(forecast, today);
  const sky = skyFor(forecast.current.code, isNight(minutes));
  const style = {
    background: `linear-gradient(135deg, color-mix(in oklab, ${TINT[sky]} 22%, var(--surface)) 0%, var(--surface) 75%)`,
  } satisfies CSSProperties;

  return (
    <section aria-label="Weather" style={style} className="flex flex-col gap-4 rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <PinIcon />
          {forecast.place}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">Sample forecast</span>
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
          const hourSky = skyFor(h.code, isNight(h.minutes));
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

import { addDays } from "./dates";

// Weather shapes and a PLACEHOLDER forecast, so the UI can be designed before the real
// Open-Meteo call exists. Field names follow Open-Meteo's daily/hourly response
// (weather_code, temperature_2m_max/min, precipitation_probability_max), so swapping in
// the real data later only replaces `sampleForecast`.

/** What an icon draws. Derived from Open-Meteo's WMO weather code, plus day or night. */
export type Sky = "clear" | "clear-night" | "partly" | "partly-night" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type DayForecast = {
  date: string; // YYYY-MM-DD, same keys as src/lib/dates.ts
  code: number; // WMO weather code
  high: number; // °F
  low: number; // °F
  precipChance: number; // 0–100
};

export type HourForecast = { minutes: number; code: number; temp: number }; // minutes since local midnight

export type Forecast = {
  place: string;
  current: { code: number; temp: number; feelsLike: number; wind: number };
  hours: HourForecast[];
  days: DayForecast[];
};

/** WMO weather codes, as Open-Meteo documents them, grouped into what we can draw. */
function skyOf(code: number): Exclude<Sky, "clear-night" | "partly-night"> {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export function skyFor(code: number, night = false): Sky {
  const sky = skyOf(code);
  if (night && sky === "clear") return "clear-night";
  if (night && sky === "partly") return "partly-night";
  return sky;
}

const LABELS: Record<Sky, string> = {
  clear: "Sunny",
  "clear-night": "Clear",
  partly: "Partly cloudy",
  "partly-night": "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Foggy",
  drizzle: "Drizzle",
  rain: "Rain",
  snow: "Snow",
  storm: "Thunderstorms",
};

export function skyLabel(sky: Sky): string {
  return LABELS[sky];
}

/** Rough local night, until real sunrise and sunset come from the API. */
export function isNight(minutes: number): boolean {
  return minutes < 6 * 60 || minutes >= 19 * 60;
}

/** "3 PM", "Now" is handled by the caller. */
export function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

// ---- Placeholder data ----

/** A fixed week, by days from today, chosen to show every kind of weather. */
const SAMPLE_WEEK: Omit<DayForecast, "date">[] = [
  { code: 2, high: 64, low: 51, precipChance: 10 },
  { code: 63, high: 58, low: 49, precipChance: 80 },
  { code: 0, high: 67, low: 50, precipChance: 0 },
  { code: 3, high: 61, low: 52, precipChance: 20 },
  { code: 95, high: 63, low: 54, precipChance: 70 },
  { code: 45, high: 55, low: 44, precipChance: 10 },
  { code: 73, high: 39, low: 30, precipChance: 60 },
];

/** A sample forecast for the week starting `today`. Not real weather. */
export function sampleForecast(today: string, minutes: number): Forecast {
  const days = SAMPLE_WEEK.map((d, i) => ({ ...d, date: addDays(today, i) }));
  const nextHour = (Math.floor(minutes / 60) + 1) * 60;
  const hourCodes = [2, 2, 3, 61, 3];
  const hours = hourCodes.map((code, i) => {
    const at = nextHour + i * 3 * 60;
    // Warmest mid-afternoon, coolest before dawn.
    const temp = Math.round(57.5 + 6.5 * Math.cos(((at / 60 - 15) / 24) * 2 * Math.PI));
    return { minutes: at % (24 * 60), code, temp };
  });
  return {
    place: "Chicago, Illinois",
    current: { code: 2, temp: 62, feelsLike: 60, wind: 9 },
    hours,
    days,
  };
}

/** The forecast for one day, if it's within the forecast range. */
export function dayForecast(forecast: Forecast, day: string): DayForecast | undefined {
  return forecast.days.find((d) => d.date === day);
}

// Weather from Open-Meteo (https://open-meteo.com): free, no API key. Called from the browser,
// so each person's requests count against their own rate limit and no key needs hiding.
// The forecast is never saved anywhere; only the location is (see weatherSettings.ts).

/** What an icon draws. Derived from Open-Meteo's WMO weather code, plus day or night. */
export type Sky = "clear" | "clear-night" | "partly" | "partly-night" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type DayForecast = {
  date: string; // YYYY-MM-DD in the forecast place's own time zone
  code: number; // WMO weather code
  high: number; // °F
  low: number; // °F
  precipChance: number; // 0–100
};

/** minutes: since local midnight. */
export type HourForecast = { minutes: number; code: number; temp: number; night: boolean };

export type Forecast = {
  current: { code: number; temp: number; feelsLike: number; wind: number; night: boolean };
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

/** "3 PM", "Now" is handled by the caller. */
export function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

/** The forecast for one day, if it's within the forecast range. */
export function dayForecast(forecast: Forecast, day: string): DayForecast | undefined {
  return forecast.days.find((d) => d.date === day);
}

// ---- Open-Meteo calls ----

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** The parts of Open-Meteo's forecast response Dayplan reads. */
type ForecastResponse = {
  current: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; is_day: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
};

/** Seven days for one place, in °F and mph, in that place's own time zone. Throws when the API is down. */
export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
  });
  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo forecast: HTTP ${res.status}`);
  return toForecast((await res.json()) as ForecastResponse);
}

function toForecast(r: ForecastResponse): Forecast {
  const c = r.current;
  // The next five 3-hour slots after the current hour ("2026-10-22T20:30" → the 20:00 entry).
  const now = r.hourly.time.indexOf(`${c.time.slice(0, 13)}:00`);
  const hours: HourForecast[] = [];
  for (let i = now + 1; now >= 0 && i < r.hourly.time.length && hours.length < 5; i += 3) {
    const [h, m] = r.hourly.time[i].slice(11, 16).split(":").map(Number);
    hours.push({
      minutes: h * 60 + m,
      code: r.hourly.weather_code[i],
      temp: Math.round(r.hourly.temperature_2m[i]),
      night: r.hourly.is_day[i] === 0,
    });
  }
  return {
    current: {
      code: c.weather_code,
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      wind: Math.round(c.wind_speed_10m),
      night: c.is_day === 0,
    },
    hours,
    days: r.daily.time.map((date, i) => ({
      date,
      code: r.daily.weather_code[i],
      high: Math.round(r.daily.temperature_2m_max[i]),
      low: Math.round(r.daily.temperature_2m_min[i]),
      precipChance: r.daily.precipitation_probability_max[i] ?? 0,
    })),
  };
}

export type Place = { id: number; label: string; detail: string; lat: number; lon: number };

/**
 * Search cities by name. Returns [] when nothing matches (Open-Meteo then omits `results`).
 * Throws when the API is down, so the caller can tell "nothing found" from "not working".
 */
export async function searchPlaces(name: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name, count: "6", language: "en", format: "json" });
  const res = await fetch(`${GEOCODE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo geocoding: HTTP ${res.status}`);
  const body = (await res.json()) as {
    results?: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (body.results ?? []).map((p) => ({
    id: p.id,
    // Saved and shown on Today, e.g. "Chicago, Illinois".
    label: [p.name, p.admin1 ?? p.country].filter(Boolean).join(", "),
    // Only to tell same-named places apart in the list.
    detail: [p.admin1, p.country].filter(Boolean).join(", "),
    lat: p.latitude,
    lon: p.longitude,
  }));
}

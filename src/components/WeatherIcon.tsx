import { useId } from "react";
import type { Sky } from "@/lib/weather";

/**
 * A small weather drawing. Decorative: the condition is always written out next to it.
 * `animated` adds gentle motion (sun turns, clouds drift, rain falls); it stops for
 * anyone who prefers reduced motion (see the wx- classes in globals.css).
 */
export function WeatherIcon({ sky, size = 24, animated = false }: { sky: Sky; size?: number; animated?: boolean }) {
  const a = (cls: string) => (animated ? cls : undefined);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="shrink-0 overflow-visible">
      {sky === "clear" && <Sun cx={32} cy={32} r={12} className={a("wx-spin")} />}
      {sky === "clear-night" && (
        <>
          <Moon cx={34} cy={32} r={14} />
          <Star x={14} y={18} className={a("wx-twinkle")} />
          <Star x={50} y={50} className={a("wx-twinkle wx-delay-2")} small />
        </>
      )}
      {sky === "partly" && (
        <>
          <Sun cx={24} cy={24} r={9} className={a("wx-spin")} />
          <Cloud className={a("wx-drift")} dy={4} />
        </>
      )}
      {sky === "partly-night" && (
        <>
          <Moon cx={24} cy={22} r={10} />
          <Cloud className={a("wx-drift")} dy={4} />
        </>
      )}
      {sky === "cloudy" && (
        <>
          <Cloud className={a("wx-drift-slow")} dx={-8} dy={-8} scale={0.7} back />
          <Cloud className={a("wx-drift")} />
        </>
      )}
      {sky === "fog" && (
        <>
          <Cloud dy={-6} />
          {[48, 54, 60].map((y, i) => (
            <line
              key={y}
              x1={i === 1 ? 14 : 18}
              x2={i === 1 ? 46 : 50}
              y1={y}
              y2={y}
              stroke="var(--wx-cloud-edge)"
              strokeWidth={3}
              strokeLinecap="round"
              className={a(`wx-fog wx-delay-${i}`)}
            />
          ))}
        </>
      )}
      {(sky === "drizzle" || sky === "rain") && (
        <>
          <Cloud dy={-6} />
          {(sky === "rain" ? [22, 32, 42] : [26, 38]).map((x, i) => (
            <line
              key={x}
              x1={x}
              x2={x - 3}
              y1={46}
              y2={sky === "rain" ? 55 : 51}
              stroke="var(--wx-rain)"
              strokeWidth={3}
              strokeLinecap="round"
              className={a(`wx-fall wx-delay-${i}`)}
            />
          ))}
        </>
      )}
      {sky === "snow" && (
        <>
          <Cloud dy={-6} />
          {[22, 32, 42].map((x, i) => (
            <circle key={x} cx={x} cy={i === 1 ? 52 : 49} r={2.6} fill="var(--wx-snow)" className={a(`wx-snowfall wx-delay-${i}`)} />
          ))}
        </>
      )}
      {sky === "storm" && (
        <>
          <Cloud dy={-6} dark />
          <path d="M34 40 L26 52 H32 L28 62 L40 48 H34 L38 40 Z" fill="var(--wx-bolt)" className={a("wx-flash")} />
        </>
      )}
    </svg>
  );
}

function Sun({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  const inner = r + 4;
  const outer = r + 9;
  return (
    <g>
      <g className={className}>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * inner}
              y1={cy + Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cy + Math.sin(angle) * outer}
              stroke="var(--wx-sun)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill="var(--wx-sun)" />
    </g>
  );
}

/** A crescent: the full circle minus an offset circle, cut out with a mask. */
function Moon({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Each moon on the page needs its own mask id; strip characters that break url(#…).
  const id = `moon${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <>
      <mask id={id}>
        <rect width="64" height="64" fill="white" />
        <circle cx={cx + r * 0.55} cy={cy - r * 0.45} r={r * 0.85} fill="black" />
      </mask>
      <circle cx={cx} cy={cy} r={r} fill="var(--wx-moon)" mask={`url(#${id})`} />
    </>
  );
}

function Star({ x, y, small, className }: { x: number; y: number; small?: boolean; className?: string }) {
  const s = small ? 2.5 : 3.5;
  return (
    <path
      d={`M${x} ${y - s * 1.6} L${x + s * 0.45} ${y - s * 0.45} L${x + s * 1.6} ${y} L${x + s * 0.45} ${y + s * 0.45} L${x} ${y + s * 1.6} L${x - s * 0.45} ${y + s * 0.45} L${x - s * 1.6} ${y} L${x - s * 0.45} ${y - s * 0.45} Z`}
      fill="var(--wx-moon)"
      className={className}
    />
  );
}

/** One puffy cloud, about 44 units wide, sitting in the lower middle of the box. */
function Cloud({
  dx = 0,
  dy = 0,
  scale = 1,
  back,
  dark,
  className,
}: {
  dx?: number;
  dy?: number;
  scale?: number;
  back?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <g transform={`translate(${dx} ${dy}) translate(32 38) scale(${scale}) translate(-32 -38)`}>
      <path
        d="M18 48 H47 A10 10 0 0 0 47 28 A15 15 0 0 0 19 30 A9 9 0 0 0 18 48 Z"
        fill={dark ? "var(--wx-cloud-dark)" : back ? "var(--wx-cloud-back)" : "var(--wx-cloud)"}
        stroke="var(--wx-cloud-edge)"
        strokeWidth={2}
        strokeLinejoin="round"
        className={className}
      />
    </g>
  );
}

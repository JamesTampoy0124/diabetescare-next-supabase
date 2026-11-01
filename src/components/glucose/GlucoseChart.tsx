"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  buildGlucoseChart,
  classifyGlucose,
  glucoseContextLabel,
  glucoseText,
  glucoseTimeLabel,
  type ChartPoint,
  type GlucoseReading,
  type GlucoseUnit,
} from "@/lib/glucose";

interface GlucoseChartProps {
  /** Valid readings, oldest first. */
  readings: GlucoseReading[];
  days: number;
  now: number;
  unit: GlucoseUnit;
  timeZone: string;
  who: (reading: GlucoseReading) => string;
}

function Marker({ p }: { p: ChartPoint }) {
  if (p.flag.kind === "ok") return <circle className="gc-m gc-m-0" cx={p.x} cy={p.y} r={5} />;

  const d =
    p.flag.kind === "high"
      ? `M${p.x} ${p.y - 6.5}L${p.x + 6} ${p.y + 4.5}L${p.x - 6} ${p.y + 4.5}Z`
      : `M${p.x} ${p.y + 6.5}L${p.x + 6} ${p.y - 4.5}L${p.x - 6} ${p.y - 4.5}Z`;

  return <path className={`gc-m gc-m-${p.flag.level}`} d={d} />;
}

/** Plain SVG chart (no chart library). Hover, tap or use the arrow keys to read a point. */
export function GlucoseChart({ readings, days, now, unit, timeZone, who }: GlucoseChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState(-1);

  // Redraw when the container width changes
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => setWidth(el.clientWidth || 720));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chart = buildGlucoseChart(readings, { days, now, unit, width, timeZone });
  const last = chart.points[chart.points.length - 1];
  const activePoint = active >= 0 ? chart.points[active] : null;

  function nearest(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chart.width;
    let best = -1;
    let bestDistance = Infinity;
    chart.points.forEach((p, i) => {
      const distance = Math.abs(p.x - x);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = chart.points.length - 1;
    const current = active < 0 ? lastIndex : active;

    if (event.key === "ArrowLeft") setActive(Math.max(0, current - 1));
    else if (event.key === "ArrowRight") setActive(Math.min(lastIndex, current + 1));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(lastIndex);
    else if (event.key === "Escape") setActive(-1);
    else return;

    event.preventDefault();
  }

  const above = last ? last.y - 13 >= chart.top + 6 : true;
  const tip = activePoint?.reading;

  return (
    <div
      className="g-plot"
      ref={plotRef}
      onPointerMove={(e) => {
        const i = nearest(e);
        if (i >= 0 && i !== active) setActive(i);
      }}
      onPointerDown={(e) => {
        const i = nearest(e);
        if (i >= 0) setActive(i);
      }}
      onPointerLeave={() => setActive(-1)}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(-1)}
    >
      <svg
        className="gc-svg"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        width={chart.width}
        height={chart.height}
        role="img"
        aria-label={`Blood glucose chart: ${readings.length} readings over the last ${days} days. The table below lists every reading. Use the left and right arrow keys to move between readings.`}
        tabIndex={0}
        focusable="true"
      >
        <rect className="gc-band" x={chart.band.x} y={chart.band.y} width={chart.band.width} height={chart.band.height} />

        {chart.yTicks.map((t) => (
          <g key={t.label + t.y}>
            <line className="gc-grid" x1={chart.left} x2={chart.left + chart.innerWidth} y1={t.y} y2={t.y} />
            <text className="gc-tick" x={chart.left - 8} y={t.y + 4} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}

        <line className="gc-axis" x1={chart.left} x2={chart.left + chart.innerWidth} y1={chart.base} y2={chart.base} />

        {chart.xTicks.map((t) => (
          <text key={t.label + t.x} className="gc-tick" x={t.x} y={chart.height - 12} textAnchor="middle">
            {t.label}
          </text>
        ))}

        {chart.points.length > 1 && <path className="gc-line" d={chart.line} />}

        {chart.points.map((p) => (
          <Marker key={p.reading.id} p={p} />
        ))}

        {last && (
          <text
            className="gc-label"
            x={last.x}
            y={above ? last.y - 13 : last.y + 21}
            textAnchor={last.x > chart.left + chart.innerWidth - 30 ? "end" : "middle"}
          >
            {glucoseText(last.reading.mgdl, unit)}
          </text>
        )}

        {activePoint && (
          <>
            <line className="gc-cross" x1={activePoint.x} x2={activePoint.x} y1={chart.top} y2={chart.base} />
            <circle className="gc-halo" cx={activePoint.x} cy={activePoint.y} r={10} />
          </>
        )}
      </svg>

      {activePoint && tip && (
        <div
          className="g-tip"
          style={{
            left: Math.min(Math.max(activePoint.x - 80, 0), Math.max(0, chart.width - 240)),
            top: Math.max(0, activePoint.y - 96),
          }}
        >
          <strong>
            {glucoseText(tip.mgdl, unit)} {unit}
          </strong>
          <span className="g-tip-2">
            {classifyGlucose(tip.mgdl, tip.context).label} · {glucoseContextLabel(tip.context)}
          </span>
          <br />
          <span className="g-tip-2">{glucoseTimeLabel(tip.takenAt, timeZone)}</span>
          {tip.note && (
            <>
              <br />
              <span className="g-tip-2">{tip.note}</span>
            </>
          )}
          <br />
          <span className="g-tip-2">Recorded by {who(tip)}</span>
        </div>
      )}
    </div>
  );
}

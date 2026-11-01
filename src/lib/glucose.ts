// Blood glucose rules, unit conversion, summaries and the chart model.
// Pure functions only, so they run both on the server and in the browser.
//
// All values in mg/dL. These are general adult guideline values (for example the ADA before-meal 80-130 and
// after-meal under 180 targets). Individual targets differ, so the clinic's physician should confirm or change
// them in GLUCOSE_RULES before the system is used with real patients.

export type GlucoseUnit = "mg/dL" | "mmol/L";
export type GlucoseContext = "fasting" | "before_meal" | "after_meal" | "bedtime" | "random";

export const MGDL_PER_MMOLL = 18.016;
export const GLUCOSE_DAY = 86_400_000;

export const GLUCOSE_CONTEXTS: { value: GlucoseContext; label: string }[] = [
  { value: "fasting", label: "Fasting" },
  { value: "before_meal", label: "Before a meal" },
  { value: "after_meal", label: "After a meal (1-2 h)" },
  { value: "bedtime", label: "Bedtime" },
  { value: "random", label: "Random / other" },
];

export const GLUCOSE_RULES = {
  severeLow: 54, // below this: "Severe low"
  low: 70, // below this: "Low"
  veryHigh: 250, // above this: "Very high"
  rangeLow: 70, // general range: chart band and "in range" tile
  rangeHigh: 180,
  targets: {
    fasting: { min: 80, max: 130 },
    before_meal: { min: 80, max: 130 },
    after_meal: { min: 70, max: 180 },
    bedtime: { min: 70, max: 180 },
    random: { min: 70, max: 180 },
  } as Record<GlucoseContext, { min: number; max: number }>,
  entryMin: 20, // meters read roughly 20-600 mg/dL
  entryMax: 600,
};

// ---------- types ----------

export interface GlucoseReading {
  id: string;
  patientId: string;
  mgdl: number;
  context: GlucoseContext;
  takenAt: string; // ISO timestamp
  note: string;
  status: "valid" | "voided";
  recordedByName: string;
  recordedByRole: string;
  recordedByMe: boolean;
  voidedByName: string;
  voidReason: string;
}

export interface GlucoseAlertReading {
  mgdl: number;
  context: GlucoseContext;
  takenAt: string;
}

export interface GlucoseAlert {
  patientId: string;
  patientName: string;
  patientCode: string;
  urgent: GlucoseAlertReading[]; // newest first
  latest: GlucoseAlertReading | null; // newer reading since the urgent one, if any
}

export interface GlucoseFlag {
  key: "severe-low" | "low" | "very-high" | "below-target" | "high" | "in-range";
  label: string;
  kind: "low" | "high" | "ok";
  level: 0 | 1 | 2; // 0 = in range, 1 = outside target, 2 = urgent
}

// ---------- units ----------

export function glucoseToMgdl(value: number, unit: GlucoseUnit): number {
  return unit === "mmol/L" ? Math.round(value * MGDL_PER_MMOLL) : Math.round(value);
}

/** Text for a stored mg/dL value in the chosen unit (no unit suffix). */
export function glucoseText(mgdl: number, unit: GlucoseUnit): string {
  return unit === "mmol/L" ? (mgdl / MGDL_PER_MMOLL).toFixed(1) : String(Math.round(mgdl));
}

export function glucoseContextLabel(value: string): string {
  return GLUCOSE_CONTEXTS.find((c) => c.value === value)?.label ?? value;
}

// ---------- flags ----------

export function classifyGlucose(mgdl: number, context: GlucoseContext): GlucoseFlag {
  const r = GLUCOSE_RULES;
  const t = r.targets[context] ?? r.targets.random;

  if (mgdl < r.severeLow) return { key: "severe-low", label: "Severe low", kind: "low", level: 2 };
  if (mgdl < r.low) return { key: "low", label: "Low", kind: "low", level: 2 };
  if (mgdl > r.veryHigh) return { key: "very-high", label: "Very high", kind: "high", level: 2 };
  if (mgdl < t.min) return { key: "below-target", label: "Below target", kind: "low", level: 1 };
  if (mgdl > t.max) return { key: "high", label: "High", kind: "high", level: 1 };

  return { key: "in-range", label: "In range", kind: "ok", level: 0 };
}

// ---------- summary ----------

export function summarizeGlucose(valid: GlucoseReading[]) {
  if (!valid.length) {
    return { count: 0, latest: null as GlucoseReading | null, average: 0, min: 0, max: 0, inRange: 0 };
  }

  const values = valid.map((r) => r.mgdl);
  const sum = values.reduce((a, b) => a + b, 0);
  const inRange = valid.filter((r) => r.mgdl >= GLUCOSE_RULES.rangeLow && r.mgdl <= GLUCOSE_RULES.rangeHigh).length;

  return {
    count: valid.length,
    latest: valid[valid.length - 1],
    average: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    inRange,
  };
}

// ---------- alerts (doctors and nurses) ----------

export interface AlertRow {
  patientId: string;
  patientName: string;
  patientCode: string;
  mgdl: number;
  context: GlucoseContext;
  takenAt: string;
}

/** Patients with an urgent reading in the rows given (the last 48 hours), most recent first. */
export function buildGlucoseAlerts(rows: AlertRow[]): GlucoseAlert[] {
  const byPatient = new Map<string, AlertRow[]>();
  rows.forEach((r) => byPatient.set(r.patientId, [...(byPatient.get(r.patientId) ?? []), r]));

  const alerts: GlucoseAlert[] = [];

  byPatient.forEach((mineUnsorted) => {
    const mine = [...mineUnsorted].sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt));
    const urgent = mine.filter((r) => classifyGlucose(r.mgdl, r.context).level === 2);
    if (!urgent.length) return;

    const newestFirst = urgent.slice().reverse();
    const latest = mine[mine.length - 1];
    const pick = (r: AlertRow): GlucoseAlertReading => ({ mgdl: r.mgdl, context: r.context, takenAt: r.takenAt });

    alerts.push({
      patientId: mine[0].patientId,
      patientName: mine[0].patientName,
      patientCode: mine[0].patientCode,
      urgent: newestFirst.map(pick),
      latest: latest === newestFirst[0] ? null : pick(latest),
    });
  });

  return alerts.sort((a, b) => Date.parse(b.urgent[0].takenAt) - Date.parse(a.urgent[0].takenAt));
}

// ---------- labels (explicit locale and time zone, so server and browser print the same text) ----------

export function glucoseDateLabel(ms: number, timeZone: string): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
}

export function glucoseTimeLabel(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

// ---------- chart model ----------

export interface ChartPoint {
  i: number;
  x: number;
  y: number;
  reading: GlucoseReading;
  flag: GlucoseFlag;
}

export interface ChartModel {
  width: number;
  height: number;
  left: number;
  top: number;
  innerWidth: number;
  base: number;
  band: { x: number; y: number; width: number; height: number };
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  points: ChartPoint[];
  line: string;
}

function valueTicks(lo: number, hi: number, unit: GlucoseUnit): { mg: number; label: string }[] {
  const ticks: { mg: number; label: string }[] = [];

  if (unit === "mmol/L") {
    const from = Math.ceil(lo / MGDL_PER_MMOLL / 2) * 2;
    for (let m = from; m * MGDL_PER_MMOLL <= hi; m += 2) ticks.push({ mg: m * MGDL_PER_MMOLL, label: String(m) });
    return ticks;
  }

  const step = hi - lo > 400 ? 100 : 50;
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push({ mg: v, label: String(v) });
  return ticks;
}

/** readings: valid readings, oldest first. */
export function buildGlucoseChart(
  readings: GlucoseReading[],
  opts: { days: number; now: number; unit: GlucoseUnit; width: number; timeZone: string }
): ChartModel {
  const width = Math.max(300, Math.round(opts.width || 720));
  const height = width < 480 ? 250 : 290;
  const m = { top: 20, right: 16, bottom: 34, left: 46 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const end = opts.now;
  const start = end - opts.days * GLUCOSE_DAY;

  let lo = 50;
  let hi = 250;
  readings.forEach((r) => {
    lo = Math.min(lo, Math.floor((r.mgdl - 10) / 50) * 50);
    hi = Math.max(hi, Math.ceil((r.mgdl + 10) / 50) * 50);
  });
  lo = Math.max(0, lo);

  const px = (t: number) => {
    const x = m.left + ((t - start) / (end - start)) * iw;
    return Math.round(Math.min(m.left + iw, Math.max(m.left, x)) * 10) / 10;
  };
  const py = (v: number) => Math.round((m.top + (1 - (v - lo) / (hi - lo)) * ih) * 10) / 10;

  const points: ChartPoint[] = readings.map((r, i) => ({
    i,
    x: px(Date.parse(r.takenAt)),
    y: py(r.mgdl),
    reading: r,
    flag: classifyGlucose(r.mgdl, r.context),
  }));

  // x labels: evenly spaced, counting back from "now"
  const maxTicks = Math.max(2, Math.floor(iw / 72));
  const step = [1, 2, 3, 5, 7, 10, 14, 15, 30].find((s) => opts.days / s <= maxTicks) ?? 30;
  const xTicks: { x: number; label: string }[] = [];
  for (let t = end; t >= start; t -= step * GLUCOSE_DAY) {
    xTicks.unshift({ x: px(t), label: glucoseDateLabel(t, opts.timeZone) });
  }

  return {
    width,
    height,
    left: m.left,
    top: m.top,
    innerWidth: iw,
    base: m.top + ih,
    band: {
      x: m.left,
      y: py(GLUCOSE_RULES.rangeHigh),
      width: iw,
      height: py(GLUCOSE_RULES.rangeLow) - py(GLUCOSE_RULES.rangeHigh),
    },
    yTicks: valueTicks(lo, hi, opts.unit).map((t) => ({ y: py(t.mg), label: t.label })),
    xTicks,
    points,
    line: points.map((p, i) => (i ? "L" : "M") + p.x + " " + p.y).join(""),
  };
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addGlucoseReading, voidGlucoseReading } from "@/actions/glucose";
import "@/styles/glucose.css";
import {
  GLUCOSE_CONTEXTS,
  GLUCOSE_DAY,
  GLUCOSE_RULES,
  classifyGlucose,
  glucoseContextLabel,
  glucoseText,
  glucoseTimeLabel,
  summarizeGlucose,
  type GlucoseAlert,
  type GlucoseContext,
  type GlucoseFlag,
  type GlucoseReading,
  type GlucoseUnit,
} from "@/lib/glucose";
import { ROLES } from "@/lib/roles";
import type { UserRole } from "@/types/database";
import { GlucoseChart } from "./GlucoseChart";
import { GlucoseDialog } from "./GlucoseDialog";

const UNIT_KEY = "diabetescare.glucoseUnit";
const RANGES = [7, 14, 30, 90];

interface GlucoseDashboardProps {
  /** Doctors and nurses see every patient; patients see only their own. */
  isStaff: boolean;
  /** The patient shown (null: none chosen / no patient record yet). */
  patient: { id: string; label: string } | null;
  /** Staff only: patients to choose from. */
  patients: { id: string; label: string }[];
  /** Up to 90 days of readings for `patient`, oldest first (valid and voided). */
  readings: GlucoseReading[];
  /** Staff only: patients with an urgent reading in the last 48 hours. */
  alerts: GlucoseAlert[];
  /** Server time in ms, so the server and the browser draw the same chart. */
  now: number;
  timeZone: string;
  /** Page address used when staff choose another patient. */
  basePath: string;
}

function FlagChip({ flag }: { flag: GlucoseFlag }) {
  const icon = flag.kind === "low" ? "▼" : flag.kind === "high" ? "▲" : "●";
  return (
    <span className={`g-flag g-lvl-${flag.level}`}>
      <span className="g-ico" aria-hidden="true">
        {icon}
      </span>
      {flag.label}
    </span>
  );
}

function localDateTimeValue(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type DialogState = null | { type: "add"; nowLocal: string } | { type: "void"; reading: GlucoseReading };
type Notice = null | { kind: "ok" | "warn" | "urgent"; text: string };

export function GlucoseDashboard({
  isStaff,
  patient,
  patients,
  readings,
  alerts,
  now,
  timeZone,
  basePath,
}: GlucoseDashboardProps) {
  const router = useRouter();
  const [days, setDays] = useState(14);
  const [unit, setUnit] = useState<GlucoseUnit>("mg/dL");
  const [showVoided, setShowVoided] = useState(false);
  const [tableLimit, setTableLimit] = useState(15);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // The unit you chose last time
  useEffect(() => {
    try {
      const saved = localStorage.getItem(UNIT_KEY);
      if (saved === "mmol/L" || saved === "mg/dL") setUnit(saved);
    } catch {
      /* storage not available */
    }
  }, []);

  function chooseUnit(next: GlucoseUnit) {
    setUnit(next);
    try {
      localStorage.setItem(UNIT_KEY, next);
    } catch {
      /* storage not available */
    }
  }

  const since = now - days * GLUCOSE_DAY;
  const inWindow = readings.filter((r) => {
    const t = Date.parse(r.takenAt);
    return t >= since && t <= now + 5 * 60_000;
  });
  const valid = inWindow.filter((r) => r.status !== "voided");
  const summary = summarizeGlucose(valid);
  const rows = (showVoided ? inWindow : valid).slice().reverse();
  const shown = rows.slice(0, tableLimit);

  const who = (r: GlucoseReading) => {
    if (r.recordedByMe) return "You";
    const role = ROLES[r.recordedByRole as UserRole] ?? "";
    return (r.recordedByName || "Care team") + (role ? ` (${role})` : "");
  };

  const canVoid = (r: GlucoseReading) => r.status !== "voided" && (isStaff || r.recordedByMe);
  const time = (iso: string) => glucoseTimeLabel(iso, timeZone);
  const text = (mg: number) => glucoseText(mg, unit);

  function savedNotice(mgdl: number, context: GlucoseContext) {
    const flag = classifyGlucose(mgdl, context);
    const value = `${text(mgdl)} ${unit}`;

    if (flag.key === "severe-low" || flag.key === "low") {
      setNotice({
        kind: "urgent",
        text:
          `${flag.key === "severe-low" ? "Severe low" : "Low"} reading saved (${value}). ` +
          (isStaff
            ? "Follow your clinic's low blood sugar protocol. "
            : "Follow the low blood sugar plan your care team gave you and let them know. ") +
          "If there is confusion, fainting or severe symptoms, get emergency help now.",
      });
    } else if (flag.key === "very-high") {
      setNotice({
        kind: "urgent",
        text:
          `Very high reading saved (${value}). ` +
          (isStaff ? "This patient needs same-day review. " : "Contact your care team today. ") +
          "Get urgent help if there is vomiting, trouble breathing, or the person is very unwell.",
      });
    } else if (flag.level === 1) {
      setNotice({
        kind: "warn",
        text: `Reading saved (${value}). It is ${flag.label.toLowerCase()} for this time of day.`,
      });
    } else {
      setNotice({ kind: "ok", text: `Reading saved (${value}). In range.` });
    }
  }

  // ----- tile values -----
  const rLo = text(GLUCOSE_RULES.rangeLow);
  const rHi = text(GLUCOSE_RULES.rangeHigh);
  const latestFlag = summary.latest ? classifyGlucose(summary.latest.mgdl, summary.latest.context) : null;

  const [legendLow, legendHigh] = [text(GLUCOSE_RULES.low), text(GLUCOSE_RULES.veryHigh)];

  return (
    <div className="glucose">
      <div className="g-head">
        <div>
          <h2>Blood glucose</h2>
          <p className="g-sub">{patient ? (isStaff ? patient.label : "Your readings") : ""}</p>
        </div>
        <button
          type="button"
          className="g-btn"
          disabled={!patient}
          onClick={() => setDialog({ type: "add", nowLocal: localDateTimeValue(Date.now()) })}
        >
          + Add reading
        </button>
      </div>

      {notice && (
        <div className={`g-notice${notice.kind === "ok" ? "" : ` ${notice.kind}`}`} role="alert">
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      {isStaff && (
        <div className="g-card">
          <div className="g-card-head">
            <h3>Needs attention (last 48 hours)</h3>
          </div>

          {alerts.length === 0 && <p className="g-empty">No urgent readings in the last 48 hours.</p>}

          {alerts.map((a) => (
            <div className="g-alert-row" key={a.patientId}>
              <div>
                <strong>{a.patientName}</strong> ({a.patientCode})
                {a.urgent.slice(0, 3).map((r) => (
                  <div key={r.takenAt + r.mgdl}>
                    <FlagChip flag={classifyGlucose(r.mgdl, r.context)} /> <strong>{text(r.mgdl)} {unit}</strong> ·{" "}
                    {glucoseContextLabel(r.context)} · {time(r.takenAt)}
                  </div>
                ))}
                {a.urgent.length > 3 && (
                  <small>
                    and {a.urgent.length - 3} more urgent reading{a.urgent.length - 3 === 1 ? "" : "s"}
                  </small>
                )}
                {a.latest && (
                  <small>
                    Since then: latest {text(a.latest.mgdl)} {unit} ({time(a.latest.takenAt)})
                  </small>
                )}
              </div>
              <button
                type="button"
                className="g-btn small"
                onClick={() => router.push(`${basePath}?patient=${a.patientId}`)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="g-filters">
        {isStaff && (
          <label className="g-lab">
            Patient
            <select value={patient?.id ?? ""} onChange={(e) => router.push(`${basePath}?patient=${e.target.value}`)}>
              {patients.length === 0 && <option value="">No patients yet</option>}
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="g-seg" role="group" aria-label="Time range">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => {
                setDays(d);
                setTableLimit(15);
              }}
            >
              {d} days
            </button>
          ))}
        </div>

        <div className="g-seg" role="group" aria-label="Units">
          {(["mg/dL", "mmol/L"] as GlucoseUnit[]).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => chooseUnit(u)}>
              {u}
            </button>
          ))}
        </div>
      </div>

      {!patient ? (
        <div className="g-card">
          <p className="g-empty">
            {isStaff
              ? "No patients yet. Add patients in the Patients page, or ask them to register."
              : "Your patient record isn't set up yet. Please contact the clinic."}
          </p>
        </div>
      ) : (
        <>
          <div className="g-tiles">
            <div className="g-tile">
              <p className="g-tile-label">Latest reading</p>
              <p className="g-tile-value">
                {summary.latest ? (
                  <>
                    {text(summary.latest.mgdl)} <span className="g-unit">{unit}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="g-tile-sub">
                {summary.latest && latestFlag ? (
                  <>
                    <FlagChip flag={latestFlag} /> · {time(summary.latest.takenAt)}
                  </>
                ) : (
                  "No readings in this period"
                )}
              </p>
            </div>

            <div className="g-tile">
              <p className="g-tile-label">Average</p>
              <p className="g-tile-value">
                {summary.count ? (
                  <>
                    {text(summary.average)} <span className="g-unit">{unit}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="g-tile-sub">
                {summary.count} reading{summary.count === 1 ? "" : "s"}
              </p>
            </div>

            <div className="g-tile">
              <p className="g-tile-label">
                In {rLo}–{rHi} range
              </p>
              <p className="g-tile-value">{summary.count ? `${Math.round((summary.inRange / summary.count) * 100)}%` : "—"}</p>
              <p className="g-tile-sub">{summary.count ? `${summary.inRange} of ${summary.count} readings` : ""}</p>
            </div>

            <div className="g-tile">
              <p className="g-tile-label">Lowest – highest</p>
              <p className="g-tile-value">
                {summary.count ? (
                  <>
                    {text(summary.min)}–{text(summary.max)} <span className="g-unit">{unit}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="g-tile-sub"></p>
            </div>
          </div>

          <div className="g-card">
            <div className="g-card-head">
              <h3>Readings over time</h3>
              <div className="g-legend">
                <span className="g-key">
                  <svg width="12" height="12" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.5" fill="#2a78d6" />
                  </svg>{" "}
                  In range
                </span>
                <span className="g-key">
                  <svg width="14" height="12" aria-hidden="true">
                    <path d="M7 1L13 11L1 11Z" fill="#ec835a" />
                  </svg>{" "}
                  Outside target
                </span>
                <span className="g-key">
                  <svg width="14" height="12" aria-hidden="true">
                    <path d="M7 1L13 11L1 11Z" fill="#d03b3b" />
                  </svg>{" "}
                  Urgent: below {legendLow} or above {legendHigh}
                </span>
                <span className="g-key">
                  <span className="g-band-swatch"></span> {rLo}–{rHi} {unit}
                </span>
              </div>
            </div>

            {valid.length === 0 ? (
              <p className="g-empty">No readings in the last {days} days. Add a reading to see the chart.</p>
            ) : (
              <GlucoseChart readings={valid} days={days} now={now} unit={unit} timeZone={timeZone} who={who} />
            )}
          </div>

          <div className="g-card">
            <div className="g-card-head">
              <h3>All readings</h3>
              <label className="g-check">
                <input type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} /> Show
                voided entries
              </label>
            </div>

            <div className="g-table-wrap">
              {rows.length === 0 ? (
                <p className="g-empty">No readings in this period.</p>
              ) : (
                <>
                  <table className="g-table">
                    <caption className="g-sr">Glucose readings, newest first</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date and time</th>
                        <th scope="col">Reading ({unit})</th>
                        <th scope="col">Status</th>
                        <th scope="col">When</th>
                        <th scope="col">Note</th>
                        <th scope="col">Recorded by</th>
                        <th scope="col">
                          <span className="g-sr">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => {
                        const voided = r.status === "voided";
                        return (
                          <tr key={r.id} className={voided ? "g-voided" : ""}>
                            <td>{time(r.takenAt)}</td>
                            <td className="num">{text(r.mgdl)}</td>
                            <td>
                              {voided ? (
                                <>
                                  <span className="g-flag">
                                    <span className="g-ico" aria-hidden="true">
                                      ✕
                                    </span>
                                    Voided
                                  </span>
                                  <small className="g-note">{`${r.voidedByName}: ${r.voidReason}`}</small>
                                </>
                              ) : (
                                <FlagChip flag={classifyGlucose(r.mgdl, r.context)} />
                              )}
                            </td>
                            <td>{glucoseContextLabel(r.context)}</td>
                            <td className="g-note">{r.note}</td>
                            <td>{who(r)}</td>
                            <td>
                              {canVoid(r) && (
                                <button type="button" className="g-btn small" onClick={() => setDialog({ type: "void", reading: r })}>
                                  Void
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {rows.length > shown.length && (
                    <button type="button" className="g-btn secondary g-more" onClick={() => setTableLimit((n) => n + 15)}>
                      Show more ({rows.length - shown.length} older)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {dialog?.type === "add" && patient && (
        <GlucoseDialog
          title="Add glucose reading"
          submitLabel="Save reading"
          onClose={() => setDialog(null)}
          onSubmit={async (data) => {
            // The date and time box is in this device's time; send an exact moment to the server
            const local = new Date(String(data.get("takenAt") ?? ""));
            if (Number.isNaN(local.getTime())) return "Enter the date and time of the reading.";
            data.set("takenAt", local.toISOString());
            data.set("patientId", patient.id);

            const result = await addGlucoseReading(data);
            if (result.error) return result.error;

            if (result.mgdl !== undefined && result.context) savedNotice(result.mgdl, result.context as GlucoseContext);
            router.refresh();
            return null;
          }}
        >
          {isStaff && (
            <p className="g-for">
              Recording for <strong>{patient.label}</strong>
            </p>
          )}

          <div className="g-field g-field-row">
            <div>
              <label htmlFor="gf_value">Reading</label>
              <input id="gf_value" name="value" type="number" inputMode="decimal" step="any" min="0" required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="gf_unit">Unit</label>
              <select id="gf_unit" name="unit" defaultValue={unit}>
                <option value="mg/dL">mg/dL</option>
                <option value="mmol/L">mmol/L</option>
              </select>
            </div>
          </div>

          <div className="g-field">
            <label htmlFor="gf_context">When was it taken?</label>
            <select id="gf_context" name="context" defaultValue="random">
              {GLUCOSE_CONTEXTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="g-field">
            <label htmlFor="gf_takenAt">Date and time</label>
            <input id="gf_takenAt" name="takenAt" type="datetime-local" defaultValue={dialog.nowLocal} max={dialog.nowLocal} required />
          </div>

          <div className="g-field">
            <label htmlFor="gf_note">Note (optional)</label>
            <input id="gf_note" name="note" type="text" maxLength={200} placeholder="e.g. skipped lunch, felt dizzy" />
          </div>
        </GlucoseDialog>
      )}

      {dialog?.type === "void" && (
        <GlucoseDialog
          title="Void this reading?"
          submitLabel="Void reading"
          onClose={() => setDialog(null)}
          onSubmit={async (data) => {
            data.set("id", dialog.reading.id);
            const result = await voidGlucoseReading(data);
            if (result.error) return result.error;
            router.refresh();
            return null;
          }}
        >
          <p className="g-for">
            {text(dialog.reading.mgdl)} {unit} · {time(dialog.reading.takenAt)}.
            <br />
            It stays in the record marked as voided, and is left out of the chart and averages.
          </p>

          <div className="g-field">
            <label htmlFor="gf_reason">Reason</label>
            <textarea
              id="gf_reason"
              name="reason"
              rows={3}
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. entered the wrong number"
            />
          </div>
        </GlucoseDialog>
      )}
    </div>
  );
}

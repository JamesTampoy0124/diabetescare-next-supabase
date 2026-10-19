"use client";

import { useState, useTransition } from "react";
import { generateReport } from "@/actions/reports";
import { DetailRow, SelectField } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { REPORT_FIELDS, REPORT_TITLES } from "@/lib/report-labels";
import type { Report, ReportType } from "@/types/database";

/** A stored report; the generated time is already formatted on the server. */
export interface ReportItem extends Report {
  generatedLabel: string;
}

const CARDS: { type: ReportType; description: string }[] = [
  { type: "patient", description: "View registered patient statistics." },
  { type: "glucose", description: "View blood glucose monitoring data." },
  { type: "appointment", description: "View appointment statistics." },
];

function ReportDetails({ report, generatedLabel, onClose }: { report: Report; generatedLabel: string; onClose: () => void }) {
  return (
    <ModalForm title={REPORT_TITLES[report.type]} onClose={onClose}>
      <DetailRow label="Generated" value={generatedLabel} />
      {REPORT_FIELDS[report.type].map((field) => {
        const value = report.summary?.[field.key];
        return <DetailRow key={field.key} label={field.label} value={value === null || value === undefined ? "No data" : String(value)} />;
      })}
    </ModalForm>
  );
}

function ChooseReportModal({ onChoose, onClose, error, pending }: { onChoose: (type: string) => void; onClose: () => void; error?: string; pending: boolean }) {
  return (
    <ModalForm
      title="Generate Report"
      submitLabel="Generate"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onChoose(String(data.get("type") ?? ""));
      }}
      error={error}
      pending={pending}
    >
      <SelectField
        label="Report type"
        name="type"
        options={CARDS.map((c) => ({ value: c.type, label: REPORT_TITLES[c.type] }))}
      />
    </ModalForm>
  );
}

type ModalState = null | { mode: "choose" } | { mode: "view"; report: Report; generatedLabel: string };

export function ReportsView({ recent }: { recent: ReportItem[] }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function generate(type: string) {
    setError(undefined);

    startTransition(async () => {
      const result = await generateReport(type);

      if (result.error || !result.report) {
        if (modal?.mode === "choose") setError(result.error);
        else window.alert(result.error ?? "The report could not be generated.");
        return;
      }

      setModal({ mode: "view", report: result.report, generatedLabel: "Just now" });
    });
  }

  const close = () => {
    setModal(null);
    setError(undefined);
  };

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>System reports and statistics.</p>
        </div>

        <button type="button" className="primary-btn" onClick={() => setModal({ mode: "choose" })}>
          Generate Report
        </button>
      </div>

      <div className="report-grid">
        {CARDS.map((card) => (
          <div className="report-card" key={card.type}>
            <h3>{REPORT_TITLES[card.type]}</h3>
            <p>{card.description}</p>
            <button type="button" disabled={pending} onClick={() => generate(card.type)}>
              {pending ? "Working..." : "Generate"}
            </button>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 25 }}>
        <div className="panel-header">
          <h3>Recent Reports</h3>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Generated</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={3}>No reports generated yet.</td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id}>
                    <td>{REPORT_TITLES[r.type]}</td>
                    <td>{r.generatedLabel}</td>
                    <td>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => setModal({ mode: "view", report: r, generatedLabel: r.generatedLabel })}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.mode === "choose" && (
        <ChooseReportModal onChoose={generate} onClose={close} error={error} pending={pending} />
      )}
      {modal?.mode === "view" && (
        <ReportDetails report={modal.report} generatedLabel={modal.generatedLabel} onClose={close} />
      )}
    </section>
  );
}

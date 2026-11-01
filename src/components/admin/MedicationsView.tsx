"use client";

import { useState } from "react";
import { createMedication } from "@/actions/medications";
import { Field } from "@/components/ui/Fields";
import { ModalForm } from "@/components/ui/Modal";
import { useFormSubmit } from "@/components/ui/useFormSubmit";
import type { Medication } from "@/types/database";

function AddMedicationModal({ onClose }: { onClose: () => void }) {
  const { state, pending, submit } = useFormSubmit(createMedication);

  return (
    <ModalForm
      title="Add Medication"
      submitLabel="Add Medication"
      onClose={onClose}
      onSubmit={(e) => submit(e, onClose)}
      error={state?.error}
      pending={pending}
    >
      <Field label="Medication name" name="name" type="text" required maxLength={80} />
      <Field label="Description" name="description" type="text" maxLength={120} placeholder="e.g. Diabetes medication" />
      <Field label="Dosage" name="dosage" type="text" maxLength={40} placeholder="e.g. 500 mg" />
    </ModalForm>
  );
}

export function MedicationsView({ medications, canAdd }: { medications: Medication[]; canAdd: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="page active-page">
      <div className="page-heading">
        <div>
          <h1>Medication Management</h1>
          <p>Monitor medications registered in the system.</p>
        </div>

        {canAdd && (
          <button type="button" className="primary-btn" onClick={() => setAdding(true)}>
            + Add Medication
          </button>
        )}
      </div>

      <div className="cards-grid">
        {medications.length === 0 && <p>No medications yet.</p>}

        {medications.map((m) => (
          <div className="medication-card" key={m.id}>
            <h3>{m.name}</h3>
            <p>{m.description}</p>
            <strong>{m.dosage}</strong>
            <span>{m.status}</span>
          </div>
        ))}
      </div>

      {adding && <AddMedicationModal onClose={() => setAdding(false)} />}
    </section>
  );
}

import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
}

export function Field({ label, name, hint, ...inputProps }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={`f_${name}`}>{label}</label>
      <input id={`f_${name}`} name={name} {...inputProps} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}

export function SelectField({ label, name, options, defaultValue, required }: SelectFieldProps) {
  return (
    <div className="field">
      <label htmlFor={`f_${name}`}>{label}</label>
      <select id={`f_${name}`} name={name} defaultValue={defaultValue} required={required}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

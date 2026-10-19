/** The coloured pill used in tables and cards (.status.active / .confirmed / .pending / ...). */
export function StatusBadge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`status ${kind}`}>{children}</span>;
}

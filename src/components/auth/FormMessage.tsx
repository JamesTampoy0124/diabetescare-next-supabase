export function FormMessage({ kind, children }: { kind: "error" | "success" | "info"; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className={`form-message ${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

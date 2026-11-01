
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}
    >
      <style>{"@keyframes dc-spin { to { transform: rotate(360deg); } }"}</style>
      <div
        style={{
          width: 36,
          height: 36,
          border: "4px solid #d3f9d8",
          borderTopColor: "#087f5b",
          borderRadius: "50%",
          animation: "dc-spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

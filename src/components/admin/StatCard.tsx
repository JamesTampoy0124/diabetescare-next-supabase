interface StatCardProps {
  color: "green" | "blue" | "orange" | "purple";
  icon: string;
  label: string;
  value: number;
  caption: string;
}

export function StatCard({ color, icon, label, value, caption }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <small>{caption}</small>
      </div>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: number | string;
  subtitle?: string;
  accent?: "positive" | "negative" | "neutral";
};

export default function KpiCard({
  label,
  value,
  subtitle,
  accent = "neutral",
}: KpiCardProps) {
  const accentClass =
    accent === "positive"
      ? "kpi-positive"
      : accent === "negative"
      ? "kpi-negative"
      : "kpi-neutral";

  return (
    <div className={`kpi-card ${accentClass}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
}

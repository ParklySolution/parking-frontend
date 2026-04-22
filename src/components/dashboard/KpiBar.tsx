import type { PlateLog } from "@/types/plateLog";
import "./KpiBar.css";
interface Props {
  logs: PlateLog[];
}

export default function KpiBar({ logs }: Props) {
  const today = new Date().toDateString();

  const todayLogs = logs.filter(
    (l) => new Date(l.timestamp).toDateString() === today
  );

  const total = todayLogs.length;
  const subscribers = todayLogs.filter((l) => l.status === "SUBSCRIBER").length;
  const occasional = todayLogs.filter((l) => l.status === "OCCASIONAL").length;
  const blocked = todayLogs.filter((l) => l.status === "BLOCKED").length;

  return (
    <div className="kpi-bar">
      <div className="kpi total">🚗 {total}<span>Transiti</span></div>
      <div className="kpi subscriber">✅ {subscribers}<span>Abbonati</span></div>
      <div className="kpi occasional">🅿️ {occasional}<span>Occasionali</span></div>
      <div className="kpi blocked">🚫 {blocked}<span>Bloccati</span></div>
    </div>
  );
}

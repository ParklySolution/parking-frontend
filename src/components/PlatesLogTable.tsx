
import type { PlateLog } from "@/types/plateLog";
import "./PlatesLogTable.css";

interface Props {
  logs: PlateLog[];
}

export default function PlatesLogTable({ logs }: Props) {
  return (
    <div className="log-card">
      <h3>📋 Storico accessi</h3>

      {logs.length === 0 && (
        <div className="log-empty">📭 Nessun transito registrato</div>
      )}

      {logs.length > 0 && (
        <table className="log-table">
          <thead>
            <tr>
              <th>Ora</th>
              <th>Targa</th>
              <th>Stato</th>
              <th>Messaggio</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, index) => {
              const time = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString("it-IT")
                : "—";

              return (
                <tr
                  key={`${log.plate}-${log.timestamp ?? index}`}
                  className={log.status.toLowerCase()}
                >
                  <td>{time}</td>

                  <td>
                    <strong>{log.plate}</strong>
                  </td>

                  <td>
                    <span className={`badge ${log.status.toLowerCase()}`}>
                      {log.status === "ALLOWED"
                        ? "🟢 CONSENTITO"
                        : "🔴 NEGATO"}
                    </span>
                  </td>

                  <td>
                    {log.message === "active_subscription" &&
                      "🎟️ Abbonamento attivo"}
                    {log.message === "blocked_plate" &&
                      "⛔ Targa bloccata"}
                    {log.message === "no_subscription" &&
                      "❌ Nessun abbonamento"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

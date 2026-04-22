export default function RecentEvents({ events }: { events: any[] }) {
  return (
    <div className="section-card">
      <h3>Eventi Recenti</h3>

      {events.length === 0 ? (
        <p>Nessun evento registrato.</p>
      ) : (
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id} className="event-item">
              <div className="event-type">{e.event_type}</div>
              <div className="event-meta">
                {e.tenant_id ? `Tenant: ${e.tenant_id}` : "—"}
              </div>
              <div className="event-date">
                {new Date(e.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

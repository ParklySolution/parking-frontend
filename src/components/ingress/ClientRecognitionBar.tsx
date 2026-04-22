// src/components/ingress/ClientRecognitionBar.tsx
import type { CustomerLookupResult } from "@/services/customerLookupService";
import "@/styles/ingresso.css";

// Funzione per formattare la data in formato italiano
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "N/D";
  try {
    return new Date(dateString).toLocaleDateString("it-IT");
  } catch {
    return dateString;
  }
};

export default function ClientRecognitionBar({
  result,
}: {
  result: CustomerLookupResult;
}) {
  if (result.status === "idle") return null;

  if (result.status === "loading") {
    return (
      <div className="client-bar client-bar--loading">
        ⏳ Ricerca cliente in corso...
      </div>
    );
  }

  if (result.status === "not_found") {
    return (
      <div className="client-bar client-bar--notfound">
        🔎 Nessun cliente associato a questa targa (ok: cliente occasionale)
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="client-bar client-bar--error">
        ⚠️ Errore riconoscimento cliente: {result.message}
      </div>
    );
  }

  // found
  const { customer, vehicle, outstandings, contracts } = result;

  // Verifica se ci sono contratti attivi
  const hasActiveSubscription = !!contracts?.subscription;
  const hasActiveFidelity = !!contracts?.fidelity;
  const hasActiveConventions = contracts?.conventions && contracts.conventions.length > 0;

  // Assicurati che conventions sia un array per evitare errori
  const safeConventions = contracts?.conventions || [];

  return (
    <div className="client-bar client-bar--found">
      {/* RIGA 1: Cliente e veicolo */}
      <div className="client-left">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span>✅</span>
          <strong className="client-name">{customer?.name || "Cliente non registrato"}</strong>
          
          {/* Badge per contratti attivi */}
          {hasActiveSubscription && (
            <span className="badge badge-subscription">🎫 ABBONAMENTO</span>
          )}
          {hasActiveFidelity && (
            <span className="badge badge-fidelity">⭐ FEDELTÀ</span>
          )}
          {hasActiveConventions && (
            <span className="badge badge-convention">📜 CONVENZIONE</span>
          )}
        </div>

        <div className="client-meta" style={{ marginTop: "4px" }}>
          {/* Email e telefono */}
          {customer?.email && <span>📧 {customer.email}</span>}
          {customer?.phone && <span>📞 {customer.phone}</span>}
          
          {/* Codice fiscale se presente */}
          {customer?.fiscal_code && (
            <span>🆔 CF: {customer.fiscal_code}</span>
          )}
        </div>

        {/* Dettaglio veicolo */}
        {vehicle ? (
          <div className="client-meta" style={{ marginTop: "4px", fontFamily: "monospace" }}>
            🚗 Targa: <strong>{vehicle.plate}</strong>
            {vehicle.brand && vehicle.model && (
              <span> • {vehicle.brand} {vehicle.model}</span>
            )}
            {vehicle.color && <span> • {vehicle.color}</span>}
            {vehicle.category && <span> • {vehicle.category.name}</span>}
            {!vehicle.is_active && (
              <span className="client-flag"> • ⛔ veicolo disattivo</span>
            )}
          </div>
        ) : (
          <div className="client-meta" style={{ marginTop: "4px", color: "#9ca3af" }}>
            🚗 Veicolo non specificato
          </div>
        )}
      </div>

      {/* RIGA 2: Dettaglio contratti */}
      {(hasActiveSubscription || hasActiveFidelity || hasActiveConventions) && (
        <div className="client-contracts" style={{ 
          marginTop: "8px", 
          padding: "8px", 
          background: "rgba(79, 140, 255, 0.1)", 
          borderRadius: "6px",
          borderLeft: "3px solid #4f8cff"
        }}>
          {/* Abbonamento */}
          {contracts?.subscription && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: "bold", color: "#4f8cff" }}>🎫 ABBONAMENTO ATTIVO:</span>
              <span>{contracts.subscription.contract_number}</span>
              <span>📅 Scadenza: {formatDate(contracts.subscription.valid_to)}</span>
              <span style={{ color: "#10b981" }}>✅ Sosta inclusa</span>
            </div>
          )}

          {/* Fedeltà */}
          {contracts?.fidelity && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: contracts.subscription ? "4px" : "0" }}>
              <span style={{ fontWeight: "bold", color: "#f59e0b" }}>⭐ FEDELTÀ ATTIVA:</span>
              <span>{contracts.fidelity.contract_number}</span>
              <span>📅 Scadenza: {formatDate(contracts.fidelity.valid_to)}</span>
              <span style={{ color: "#f59e0b" }}>🎁 Accumulo punti</span>
            </div>
          )}

          {/* Convenzioni - usando safeConventions per sicurezza */}
          {safeConventions.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              {safeConventions.map((conv, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: idx > 0 ? "4px" : "0" }}>
                  <span style={{ fontWeight: "bold", color: "#8b5cf6" }}>📜 CONVENZIONE:</span>
                  <span>{conv.template_name}</span>
                  <span>{conv.contract_number}</span>
                  <span>📅 Scadenza: {formatDate(conv.valid_to)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RIGA 3: Insoluti */}
      <div className="client-right" style={{ marginTop: "8px" }}>
        {outstandings.count > 0 ? (
          <span className="client-alert">
            ⚠️ Insoluti: <strong>{outstandings.count}</strong> • Totale{" "}
            <strong>€ {outstandings.total.toFixed(2)}</strong>
          </span>
        ) : (
          <span className="client-ok">✅ Nessun insoluto</span>
        )}
      </div>
    </div>
  );
}
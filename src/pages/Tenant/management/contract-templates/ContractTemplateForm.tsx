import { useState } from "react";
import { supabase } from "@/services/supabase";

interface ContractTemplateFormProps {
  tenantId: string;
  template: any | null;
  terms: any[];
  onClose: () => void;
}

// LAYOUT PREDEFINITI (solo per l'interfaccia utente)
const LAYOUTS_PREDEFINITI = [
  {
    id: 'classic',
    nome: '📄 Layout Classico',
    descrizione: 'Intestazione azienda in alto, dati cliente e veicolo, termini in riquadro, firme in basso',
    struttura: `
      <div style="max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
        <!-- INTESTAZIONE AZIENDA -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
          {'{{COMPANY_LOGO}}'}
          <h1>{'{{COMPANY_NAME}}'}</h1>
          <p>{'{{COMPANY_ADDRESS}}'} | P.IVA {'{{COMPANY_VAT}}'}</p>
          <p>Tel: {'{{COMPANY_PHONE}}'} | Email: {'{{COMPANY_EMAIL}}'}</p>
        </div>
        
        <!-- TITOLO CONTRATTO -->
        <h2 style="text-align: center; margin: 30px 0;">{'{{CONTRACT_TITLE}}'}</h2>
        <p style="text-align: right;">N. {'{{CONTRACT_NUMBER}}'} del {'{{CONTRACT_DATE}}'}</p>
        
        <!-- DATI CLIENTE (ANAGRAFICA) -->
        <div style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3>Dati del Cliente</h3>
          <p><strong>Il Sig./Sig.ra</strong> {'{{CUSTOMER_FULLNAME}}'}</p>
          <p>nato a {'{{CUSTOMER_BIRTH_PLACE}}'} il {'{{CUSTOMER_BIRTH_DATE}}'}</p>
          <p>Codice Fiscale: {'{{CUSTOMER_FISCAL_CODE}}'}</p>
          
          <h4 style="margin-top: 15px;">Residenza</h4>
          <p>{'{{CUSTOMER_ADDRESS}}'} - {'{{CUSTOMER_CITY}}'} ({'{{CUSTOMER_PROVINCE}}'}) CAP {'{{CUSTOMER_POSTAL_CODE}}'}</p>
          
          <h4 style="margin-top: 15px;">Contatti</h4>
          <p>Email: {'{{CUSTOMER_EMAIL}}'} | Tel: {'{{CUSTOMER_PHONE}}'}</p>
          
          <h4 style="margin-top: 15px;">Documento di Riconoscimento</h4>
          <p>{'{{CUSTOMER_DOCUMENT_TYPE}}'} n. {'{{CUSTOMER_DOCUMENT_NUMBER}}'}</p>
          <p>rilasciato da {'{{CUSTOMER_DOCUMENT_ISSUING_AUTHORITY}}'} il {'{{CUSTOMER_DOCUMENT_ISSUE_DATE}}'}</p>
          <p>scadenza: {'{{CUSTOMER_DOCUMENT_EXPIRY_DATE}}'}</p>
        </div>
        
        <!-- DATI VEICOLO -->
        <div style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3>Dati del Veicolo</h3>
          <p><strong>Targa:</strong> {'{{VEHICLE_PLATE}}'}</p>
          <p><strong>Marca/Modello:</strong> {'{{VEHICLE_MAKE}}'} {'{{VEHICLE_MODEL}}'}</p>
        </div>
        
        <!-- TERMINI CONTRATTUALI -->
        <div style="margin: 30px 0;">
          <h3>Condizioni Contrattuali</h3>
          <div style="border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
            {'{{CONTRACT_TERMS}}'}
          </div>
        </div>
        
        <!-- DURATA E IMPORTO -->
        <div style="margin: 30px 0; display: flex; justify-content: space-between;">
          <div><strong>Durata:</strong> {'{{CONTRACT_DURATION}}'} mesi</div>
          <div><strong>Importo mensile:</strong> € {'{{CONTRACT_AMOUNT}}'}</div>
        </div>
        
        <!-- NOTE -->
        {'{{NOTES}}'}
        
        <!-- FIRME -->
        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div style="text-align: center;">
            <p>_________________________</p>
            <p>Firma del Cliente</p>
          </div>
          <div style="text-align: center;">
            <p>_________________________</p>
            <p>Firma {'{{COMPANY_NAME}}'}</p>
          </div>
        </div>
        
        <!-- TIMBRO -->
        <div style="margin-top: 30px; text-align: right; font-size: 12px; color: #666;">
          <p>Documento generato il {'{{GENERATION_DATE}}'}</p>
        </div>
      </div>
    `
  },
  {
    id: 'compact',
    nome: '📋 Layout Compatto',
    descrizione: 'Ideale per stampa termica, formato ridotto',
    struttura: `
      <div style="font-family: monospace; font-size: 12px; max-width: 400px;">
        <div style="text-align: center; margin-bottom: 15px;">
          <strong>{'{{COMPANY_NAME}}'}</strong><br/>
          {'{{COMPANY_ADDRESS}}'}<br/>
          P.IVA {'{{COMPANY_VAT}}'}
        </div>
        <hr/>
        <div style="text-align: center;"><strong>{'{{CONTRACT_TITLE}}'}</strong></div>
        <hr/>
        <div>
          <strong>Cliente:</strong> {'{{CUSTOMER_FULLNAME}}'}<br/>
          <strong>CF:</strong> {'{{CUSTOMER_FISCAL_CODE}}'}<br/>
          <strong>Nato il:</strong> {'{{CUSTOMER_BIRTH_DATE}}'} a {'{{CUSTOMER_BIRTH_PLACE}}'}<br/>
          <strong>Residenza:</strong> {'{{CUSTOMER_ADDRESS}}'}, {'{{CUSTOMER_CITY}}'}<br/>
          <strong>Veicolo:</strong> {'{{VEHICLE_PLATE}}'} - {'{{VEHICLE_MAKE}}'} {'{{VEHICLE_MODEL}}'}<br/>
          <strong>Documento:</strong> {'{{CUSTOMER_DOCUMENT_TYPE}}'} n.{'{{CUSTOMER_DOCUMENT_NUMBER}}'}<br/>
          <strong>Email:</strong> {'{{CUSTOMER_EMAIL}}'}
        </div>
        <hr/>
        <div><strong>Condizioni:</strong><br/>{'{{CONTRACT_TERMS}}'}</div>
        <hr/>
        <div><strong>Durata:</strong> {'{{CONTRACT_DURATION}}'} mesi - € {'{{CONTRACT_AMOUNT}}'}/mese</div>
        <hr/>
        <div style="margin-top: 20px;">
          <div>Firma cliente: _________________</div>
          <div>Firma azienda: _________________</div>
          <div style="margin-top: 10px; text-align: center;">{'{{CONTRACT_DATE}}'}</div>
        </div>
      </div>
    `
  },
  {
    id: 'minimal',
    nome: '📋 Layout Minimal',
    descrizione: 'Solo l\'essenziale',
    struttura: `
      <div style="font-family: Helvetica, Arial, sans-serif;">
        <h1 style="color: #333;">{'{{CONTRACT_TITLE}}'}</h1>
        <p><strong>N.</strong> {'{{CONTRACT_NUMBER}}'} - {'{{CONTRACT_DATE}}'}</p>
        
        <hr/>
        
        <p><strong>Azienda:</strong> {'{{COMPANY_NAME}}'} ({'{{COMPANY_VAT}}'})</p>
        <p><strong>Cliente:</strong> {'{{CUSTOMER_FULLNAME}}'} - {'{{CUSTOMER_FISCAL_CODE}}'}</p>
        <p><strong>Nato il:</strong> {'{{CUSTOMER_BIRTH_DATE}}'} a {'{{CUSTOMER_BIRTH_PLACE}}'}</p>
        <p><strong>Residenza:</strong> {'{{CUSTOMER_ADDRESS}}'}, {'{{CUSTOMER_CITY}}'}</p>
        <p><strong>Veicolo:</strong> {'{{VEHICLE_PLATE}}'} ({'{{VEHICLE_MAKE}}'} {'{{VEHICLE_MODEL}}'})</p>
        
        <hr/>
        
        <h3>Termini</h3>
        <p>{'{{CONTRACT_TERMS}}'}</p>
        
        <hr/>
        
        <p><strong>Durata:</strong> {'{{CONTRACT_DURATION}}'} mesi - <strong>Importo:</strong> € {'{{CONTRACT_AMOUNT}}'}/mese</p>
        
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <span>Firma: _________________</span>
          <span>Firma: _________________</span>
        </div>
      </div>
    `
  }
];

export default function ContractTemplateForm({ tenantId, template, terms, onClose }: ContractTemplateFormProps) {
  const [form, setForm] = useState({
    type: template?.type || "subscription",
    name: template?.name || "",
    title: template?.title || "",
    layout_id: template?.layout_id || "classic",
    terms_id: template?.terms_id || "",
    default_duration_months: template?.default_duration_months || "",
    default_price: template?.default_price || "",
    is_active: template?.is_active ?? true,
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnteprima, setShowAnteprima] = useState(false);

  const BLUE = "#3B82F6";

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.name || !form.title) {
      setError("Nome e titolo sono obbligatori");
      setSaving(false);
      return;
    }

    // Ottieni la struttura del layout selezionato
    const layoutSelezionato = LAYOUTS_PREDEFINITI.find(l => l.id === form.layout_id);
    
    // PAYLOAD CORRETTO - SOLO I CAMPI ESISTENTI
    const payload = {
      tenant_id: tenantId,
      type: form.type,
      name: form.name,
      title: form.title,
      content: layoutSelezionato?.struttura || "",  // Salviamo la struttura HTML in content
      terms_id: form.terms_id || null,
      default_duration_months: form.default_duration_months ? Number(form.default_duration_months) : null,
      default_price: form.default_price ? Number(form.default_price) : null,
      is_active: form.is_active,
    };

    console.log("📦 PAYLOAD MODELLO:", payload);

    try {
      let result;
      
      if (template?.id) {
        result = await supabase
          .from("contract_templates")
          .update(payload)
          .eq("id", template.id);
      } else {
        result = await supabase
          .from("contract_templates")
          .insert(payload);
      }

      if (result.error) {
        console.error("❌ Errore Supabase:", result.error);
        throw result.error;
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Errore:", err);
    } finally {
      setSaving(false);
    }
  }

  function getAnteprimaLayout(layoutId: string) {
    const layout = LAYOUTS_PREDEFINITI.find(l => l.id === layoutId);
    if (!layout) return "";
    
    return layout.struttura
      .replace(/{'{{COMPANY_NAME}}'}/g, "NOME AZIENDA")
      .replace(/{'{{CUSTOMER_FULLNAME}}'}/g, "NOME CLIENTE")
      .replace(/{'{{VEHICLE_PLATE}}'}/g, "TARGA")
      .replace(/{'{{CONTRACT_TERMS}}'}/g, "TERMINI CONTRATTUALI");
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#1a1f25",
        padding: "30px",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "800px",
        maxHeight: "90vh",
        overflowY: "auto",
        color: "#fff"
      }}>
        <h2 style={{ color: BLUE, marginBottom: "20px" }}>
          {template ? "Modifica modello" : "Nuovo modello contratto"}
        </h2>

        {error && (
          <div style={{
            background: "#ff4444",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "20px",
            color: "#fff"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* TIPO CONTRATTO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Tipo contratto *
            </label>
            <select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="subscription">Abbonamento</option>
              <option value="wash_fidelity">Fedeltà Lavaggio</option>
              <option value="convention">Convenzione</option>
              <option value="generic">Generico</option>
            </select>
          </div>

          {/* NOME MODELLO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Nome modello *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="es. Contratto Abbonamento Mensile"
            />
          </div>

          {/* TITOLO CONTRATTO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Titolo contratto *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="es. Contratto di Abbonamento Mensile"
            />
          </div>

          {/* LAYOUT PREDEFINITO */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "10px", color: "#9ca3af" }}>
              Layout del contratto *
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "15px"
            }}>
              {LAYOUTS_PREDEFINITI.map((layout) => (
                <div
                  key={layout.id}
                  onClick={() => handleChange("layout_id", layout.id)}
                  style={{
                    padding: "15px",
                    background: form.layout_id === layout.id ? "#2d4a8a" : "#0d1117",
                    border: `2px solid ${form.layout_id === layout.id ? BLUE : "#333"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>{layout.nome}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>
                    {layout.descrizione}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAnteprima(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #4f8cff",
                      color: "#4f8cff",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    👁 Anteprima
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TERMINI CONTRATTUALI */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Termini contrattuali da includere
            </label>
            <select
              value={form.terms_id}
              onChange={(e) => handleChange("terms_id", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="">Nessuno</option>
              {terms
                .filter(t => t.type === form.type || t.type === 'generic')
                .map(term => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
            </select>
          </div>

          {/* DURATA E PREZZO */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Durata predefinita (mesi)
              </label>
              <input
                type="number"
                min="1"
                value={form.default_duration_months}
                onChange={(e) => handleChange("default_duration_months", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  background: "#0d1117",
                  color: "#fff"
                }}
                placeholder="es. 12"
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Prezzo base (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.default_price}
                onChange={(e) => handleChange("default_price", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  background: "#0d1117",
                  color: "#fff"
                }}
                placeholder="es. 50.00"
              />
            </div>
          </div>

          {/* NOTE SUI PLACEHOLDER */}
          <div style={{
            background: "#0d1117",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
            border: "1px solid #333"
          }}>
            <h4 style={{ color: BLUE, marginBottom: "10px", fontSize: "14px" }}>
              🔑 Dati che verranno inseriti automaticamente
            </h4>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              fontSize: "12px"
            }}>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_NAME}}'}</code> - Nome azienda</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_ADDRESS}}'}</code> - Indirizzo</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_VAT}}'}</code> - P.IVA</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_EMAIL}}'}</code> - Email</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_PHONE}}'}</code> - Telefono</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{COMPANY_LOGO}}'}</code> - Logo</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_FULLNAME}}'}</code> - Nome completo</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_FIRST_NAME}}'}</code> - Nome</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_LAST_NAME}}'}</code> - Cognome</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_FISCAL_CODE}}'}</code> - Codice Fiscale</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_BIRTH_DATE}}'}</code> - Data nascita</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_BIRTH_PLACE}}'}</code> - Luogo nascita</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_ADDRESS}}'}</code> - Indirizzo</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_CITY}}'}</code> - Città</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_POSTAL_CODE}}'}</code> - CAP</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_PROVINCE}}'}</code> - Provincia</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_EMAIL}}'}</code> - Email</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_PHONE}}'}</code> - Telefono</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_DOCUMENT_TYPE}}'}</code> - Tipo documento</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_DOCUMENT_NUMBER}}'}</code> - Numero documento</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_DOCUMENT_ISSUE_DATE}}'}</code> - Data rilascio</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_DOCUMENT_EXPIRY_DATE}}'}</code> - Data scadenza</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CUSTOMER_DOCUMENT_ISSUING_AUTHORITY}}'}</code> - Ente rilascio</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{VEHICLE_PLATE}}'}</code> - Targa</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{VEHICLE_MAKE}}'}</code> - Marca</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{VEHICLE_MODEL}}'}</code> - Modello</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CONTRACT_TERMS}}'}</code> - Termini</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CONTRACT_NUMBER}}'}</code> - Numero contratto</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CONTRACT_DATE}}'}</code> - Data</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CONTRACT_DURATION}}'}</code> - Durata</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{CONTRACT_AMOUNT}}'}</code> - Importo</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{NOTES}}'}</code> - Note</div>
              <div><code style={{ background: "#1a1f25", padding: "2px 4px" }}>{'{{GENERATION_DATE}}'}</code> - Data generazione</div>
            </div>
          </div>

          {/* ATTIVA */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <span>Modello attivo</span>
            </label>
          </div>

          {/* BOTTONI */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "transparent",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              Annulla
            </button>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                background: BLUE,
                color: "#fff",
                cursor: "pointer",
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? "Salvataggio..." : (template ? "Aggiorna" : "Crea")}
            </button>
          </div>
        </form>

        {/* Modal anteprima layout */}
        {showAnteprima && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100
          }}>
            <div style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "12px",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              color: "#000"
            }}>
              <h3 style={{ marginBottom: "20px" }}>Anteprima Layout</h3>
              <div dangerouslySetInnerHTML={{ 
                __html: getAnteprimaLayout(form.layout_id) 
              }} />
              <button
                onClick={() => setShowAnteprima(false)}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  background: BLUE,
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Chiudi anteprima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
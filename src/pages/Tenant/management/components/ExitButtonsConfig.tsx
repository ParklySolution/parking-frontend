// src/pages/Tenant/management/components/ExitButtonsConfig.tsx
import { useEffect, useState } from "react";
import { 
  getAllExitButtons, 
  upsertExitButton, 
  deleteExitButton,
  toggleExitButton,
  type ExitButton 
} from "@/services/exitButtonService";

const COLORS = [
  { value: '#4f8cff', label: 'Blu' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Arancione' },
  { value: '#ef4444', label: 'Rosso' },
  { value: '#8b5cf6', label: 'Viola' },
  { value: '#ec4899', label: 'Rosa' },
];

const BUTTON_TYPES = [
  { value: 'fixed', label: 'Importo fisso (una volta)' },
  { value: 'overnight', label: 'Pernottamento (moltiplica per giorni)' },
  { value: 'hourly', label: 'Tariffa oraria (aggiunge ore)' },
  { value: 'discount', label: 'Sconto percentuale' },
];

interface Props {
  tenantId: string;
}

export default function ExitButtonsConfig({ tenantId }: Props) {
  const [buttons, setButtons] = useState<ExitButton[]>([]);
  const [editing, setEditing] = useState<Partial<ExitButton>>({ button_type: 'fixed' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadButtons();
  }, [tenantId]);

  const loadButtons = async () => {
    setLoading(true);
    const data = await getAllExitButtons(tenantId);
    setButtons(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing.label || !editing.amount) {
      alert('Inserisci testo e importo');
      return;
    }
    
    await upsertExitButton(tenantId, editing);
    setEditing({ button_type: 'fixed' });
    loadButtons();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminare questo pulsante?')) {
      await deleteExitButton(id);
      loadButtons();
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleExitButton(id, !currentStatus);
    loadButtons();
  };

  if (loading) {
    return <div style={{ color: '#9ca3af' }}>Caricamento pulsanti...</div>;
  }

  return (
    <div style={{ 
      background: '#1a1f25', 
      padding: '20px', 
      borderRadius: '8px',
      border: '1px solid #333'
    }}>
      <h3 style={{ color: '#4f8cff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚙️</span> Pulsanti schermata di uscita
      </h3>
      
      {/* Lista pulsanti esistenti */}
      {buttons.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '10px' }}>
            Pulsanti configurati
          </h4>
          {buttons.map(btn => (
            <div key={btn.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              background: '#2d2d3a',
              borderRadius: '6px',
              marginBottom: '8px',
              opacity: btn.is_active ? 1 : 0.5
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: btn.color
              }} />
              <span style={{ color: '#fff', flex: 1 }}>{btn.label}</span>
              <span style={{ color: '#4f8cff', fontWeight: 'bold' }}>€{btn.amount}</span>
              
              {/* Badge tipo pulsante */}
              <span style={{
                padding: '2px 6px',
                background: btn.button_type === 'overnight' ? '#8b5cf6' : '#6b7280',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '10px'
              }}>
                {btn.button_type === 'fixed' ? '💰 Fisso' : 
                 btn.button_type === 'overnight' ? '🏨 Notte' :
                 btn.button_type === 'hourly' ? '⏱️ Orario' : '🏷️ Sconto'}
              </span>
              
              <button
                onClick={() => handleToggle(btn.id, btn.is_active)}
                style={{
                  padding: '4px 8px',
                  background: btn.is_active ? '#10b981' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {btn.is_active ? 'Attivo' : 'Disattivo'}
              </button>
              
              <button
                onClick={() => setEditing(btn)}
                style={{
                  padding: '4px 8px',
                  background: '#4f8cff',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ✏️
              </button>
              
              <button
                onClick={() => handleDelete(btn.id)}
                style={{
                  padding: '4px 8px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form per nuovo/modifica pulsante */}
      <div style={{
        background: '#2d2d3a',
        padding: '15px',
        borderRadius: '6px'
      }}>
        <h4 style={{ color: '#fff', marginBottom: '15px' }}>
          {editing.id ? '✏️ Modifica pulsante' : '➕ Nuovo pulsante'}
        </h4>
        
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input
            type="text"
            placeholder="Testo (es. PERNOTTO)"
            value={editing.label || ''}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#1a1f25',
              color: '#fff',
              fontSize: '14px'
            }}
          />
          
          <input
            type="number"
            step="0.01"
            placeholder="Importo €"
            value={editing.amount || ''}
            onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) })}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#1a1f25',
              color: '#fff',
              fontSize: '14px'
            }}
          />
          
          <select
            value={editing.button_type || 'fixed'}
            onChange={(e) => setEditing({ ...editing, button_type: e.target.value as any })}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#1a1f25',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            {BUTTON_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          
          <select
            value={editing.color || '#4f8cff'}
            onChange={(e) => setEditing({ ...editing, color: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #333',
              background: '#1a1f25',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            {COLORS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Descrizione del tipo */}
        {editing.button_type === 'overnight' && (
          <p style={{ color: '#8b5cf6', fontSize: '12px', marginTop: '8px' }}>
            ⓘ I pulsanti di tipo "Pernottamento" moltiplicano l'importo per il numero di giorni di sosta
          </p>
        )}
        {editing.button_type === 'hourly' && (
          <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '8px' }}>
            ⓘ I pulsanti orari aggiungono l'importo per ogni ora di sosta
          </p>
        )}
        {editing.button_type === 'discount' && (
          <p style={{ color: '#10b981', fontSize: '12px', marginTop: '8px' }}>
            ⓘ Gli sconti percentuali vengono applicati sul totale
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {editing.id ? 'Aggiorna' : 'Crea'}
          </button>
          
          {editing.id && (
            <button
              onClick={() => setEditing({ button_type: 'fixed' })}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #666',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
          )}
        </div>
      </div>

      <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '15px' }}>
        I pulsanti attivi appariranno nella schermata di uscita.
      </p>
    </div>
  );
}
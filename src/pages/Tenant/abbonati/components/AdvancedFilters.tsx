// src/pages/tenant/abbonati/components/AdvancedFilters.tsx

import React, { useState } from 'react';

// Colori (copiati dalla schermata operatore)
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

interface FilterValues {
  type: string;
  status: string;
  from: string;
  to: string;
  search: string;
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  onExport: () => void;
}

// Stili condivisi
const selectStyle: React.CSSProperties = {
  padding: '10px 15px',
  background: BG_LIGHTER,
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  minWidth: '150px',
  cursor: 'pointer'
};

const inputStyle: React.CSSProperties = {
  padding: '10px 15px',
  background: BG_LIGHTER,
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  minWidth: '130px'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  border: `1px solid ${BLUE}`,
  color: BLUE,
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s'
};

const resetButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  border: '1px solid #666',
  color: '#9ca3af',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px'
};

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ onFilterChange, onExport }) => {
  const [filters, setFilters] = useState<FilterValues>({
    type: '',
    status: '',
    from: '',
    to: '',
    search: ''
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      type: '',
      status: '',
      from: '',
      to: '',
      search: ''
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div style={{ 
      background: BG_DARK, 
      padding: '20px', 
      borderRadius: '10px',
      marginBottom: '20px' 
    }}>
      {/* Riga superiore: toggle espansione e esportazione */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: isExpanded ? '20px' : '0'
      }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: BLUE,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {isExpanded ? '▼ Nascondi filtri' : '▶ Mostra filtri avanzati'}
        </button>

        <button
          onClick={onExport}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BLUE;
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = BLUE;
          }}
        >
          <span>📥</span> Esporta CSV
        </button>
      </div>

      {/* Filtri espandibili */}
      {isExpanded && (
        <>
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            flexWrap: 'wrap', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={selectStyle}
            >
              <option value="">Tutti i tipi contratto</option>
              <option value="subscription">📅 Abbonamenti</option>
              <option value="wash_fidelity">🧼 Fedeltà Lavaggio</option>
              <option value="convention">🤝 Convenzioni</option>
              <option value="generic">📄 Generici</option>
            </select>

            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={selectStyle}
            >
              <option value="">Tutti gli stati</option>
              <option value="active">✅ Attivi</option>
              <option value="expiring">⚠️ In scadenza (30gg)</option>
              <option value="expired">❌ Scaduti</option>
            </select>

            <input
              type="date"
              placeholder="Data inizio dal"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              placeholder="Data inizio al"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Cerca cliente, targa, contratto..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ ...inputStyle, minWidth: '250px' }}
            />
          </div>

          {/* Riga pulsanti reset */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              style={resetButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = BLUE;
                e.currentTarget.style.color = BLUE;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ↻ Reset filtri
            </button>
          </div>
        </>
      )}
    </div>
  );
};
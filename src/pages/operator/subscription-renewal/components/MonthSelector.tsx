// src/pages/operator/subscription-renewal/components/MonthSelector.tsx
import { useState, useEffect, useMemo } from 'react';
import { calculateAvailableMonths } from '../utils/calculateMonths';

// Colori
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

interface MonthSelectorProps {
  contract: any;
  onSelectionChange: (selected: any[], total: number) => void;
}

export const MonthSelector = ({ contract, onSelectionChange }: MonthSelectorProps) => {
  const [selectedMonths, setSelectedMonths] = useState<any[]>([]);
  
  // Calcola mesi disponibili UNA SOLA VOLTA quando contract cambia
  const months = useMemo(() => calculateAvailableMonths(contract), [contract]);
  
  const toggleMonth = (month: any) => {
    setSelectedMonths(prev => {
      // Verifica se il mese è già selezionato
      const isSelected = prev.some(m => m.key === month.key);
      
      let newSelection;
      if (isSelected) {
        // Deseleziona
        newSelection = prev.filter(m => m.key !== month.key);
      } else {
        // Seleziona
        newSelection = [...prev, month];
      }
      
      return newSelection;
    });
  };

  // Effetto separato per notificare i cambiamenti al padre
  useEffect(() => {
    const total = selectedMonths.reduce((sum, m) => sum + (m.amount || 0), 0);
    onSelectionChange(selectedMonths, total);
  }, [selectedMonths, onSelectionChange]);

  // Stile per i mesi
  const getMonthStyle = (month: any, isSelected: boolean) => ({
    padding: '15px',
    marginBottom: '10px',
    background: isSelected ? month.color || BLUE : BG_LIGHTER,
    border: `1px solid ${isSelected ? '#fff' : '#333'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ background: BG_DARK, padding: '20px', borderRadius: '12px' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px' }}>Seleziona mesi da pagare</h3>
      
      {/* Mese corrente (se disponibile) */}
      {months.current && (
  <>
    <h4 style={{ color: BLUE, margin: '10px 0' }}>📅 Mese corrente (in corso)</h4>
    <div
      onClick={() => toggleMonth(months.current)}
      style={getMonthStyle(months.current, selectedMonths.some(m => m.key === months.current.key))}
    >
      <div>
        <div style={{ 
          color: selectedMonths.some(m => m.key === months.current.key) ? '#fff' : '#9ca3af', 
          fontWeight: 'bold' 
        }}>
          {months.current.label}
        </div>
        <div style={{ fontSize: '12px', color: selectedMonths.some(m => m.key === months.current.key) ? '#fff' : '#6b7280' }}>
          {months.current.period}
          {months.current.isProportional && (
            <span style={{ marginLeft: '5px', color: '#f59e0b' }}>
              (proporzionale: {months.current.remainingDays} giorni)
            </span>
          )}
        </div>
      </div>
      <div style={{ fontWeight: 'bold', color: selectedMonths.some(m => m.key === months.current.key) ? '#fff' : BLUE }}>
        € {months.current.amount.toFixed(2)}
      </div>
    </div>
  </>
)}
      
      {/* Mesi arretrati */}
      {months.arrears && months.arrears.length > 0 && (
        <>
          <h4 style={{ color: '#ef4444', margin: '20px 0 10px' }}>⚠️ Mesi arretrati</h4>
          {months.arrears.map((m: any) => (
            <div
              key={m.key}
              onClick={() => toggleMonth(m)}
              style={getMonthStyle(m, selectedMonths.some(selected => selected.key === m.key))}
            >
              <div>
                <div style={{ 
                  color: selectedMonths.some(selected => selected.key === m.key) ? '#fff' : '#9ca3af', 
                  fontWeight: 'bold' 
                }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '12px', color: selectedMonths.some(selected => selected.key === m.key) ? '#fff' : '#6b7280' }}>
                  {m.period}
                </div>
              </div>
              <div style={{ fontWeight: 'bold', color: selectedMonths.some(selected => selected.key === m.key) ? '#fff' : BLUE }}>
                € {m.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </>
      )}
      
      {/* Mesi futuri */}
      {months.future && months.future.length > 0 && (
        <>
          <h4 style={{ color: '#10b981', margin: '20px 0 10px' }}>📅 Mesi futuri</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {months.future.map((m: any) => (
              <div
                key={m.key}
                onClick={() => toggleMonth(m)}
                style={{
                  padding: '12px',
                  background: selectedMonths.some(selected => selected.key === m.key) ? m.color || '#10b981' : BG_LIGHTER,
                  border: `1px solid ${selectedMonths.some(selected => selected.key === m.key) ? '#fff' : '#333'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  fontSize: '13px',
                  fontWeight: selectedMonths.some(selected => selected.key === m.key) ? 'bold' : 'normal',
                  color: selectedMonths.some(selected => selected.key === m.key) ? '#fff' : '#9ca3af' 
                }}>
                  {m.label}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: selectedMonths.some(selected => selected.key === m.key) ? '#fff' : BLUE,
                  marginTop: '5px'
                }}>
                  € {m.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
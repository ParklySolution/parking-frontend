// src/pages/tenant/abbonati/components/StatsCards.tsx

import React from 'react';

// Colori (copiati dalla schermata operatore per coerenza)
const BG_DARK = "#1a1f25";

interface StatsCardsProps {
  stats: {
    total: number;
    active: number;
    expiring: number;
    expired: number;
    totalRevenue: number;
    avgPrice: number;
    byType: Record<string, number>;
  };
}

interface CardProps {
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
}

const Card: React.FC<CardProps> = ({ label, value, color, subtitle }) => (
  <div style={{
    background: BG_DARK,
    padding: '20px',
    borderRadius: '10px',
    borderLeft: `4px solid ${color}`,
    transition: 'transform 0.2s',
    cursor: 'default'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
  }}>
    <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '5px' }}>{label}</div>
    <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
    {subtitle && <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>{subtitle}</div>}
  </div>
);

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  // Calcola percentuali
  const activePercentage = stats.total > 0 
    ? ((stats.active / stats.total) * 100).toFixed(1) 
    : '0';
  
  const expiringPercentage = stats.total > 0 
    ? ((stats.expiring / stats.total) * 100).toFixed(1) 
    : '0';

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '15px',
      marginBottom: '20px' 
    }}>
      <Card 
        label="Totale Contratti" 
        value={stats.total} 
        color="#4f8cff"
      />
      
      <Card 
        label="Attivi" 
        value={stats.active} 
        color="#10b981"
        subtitle={`${activePercentage}% del totale`}
      />
      
      <Card 
        label="In Scadenza (30gg)" 
        value={stats.expiring} 
        color="#f59e0b"
        subtitle={`${expiringPercentage}% del totale`}
      />
      
      <Card 
        label="Scaduti" 
        value={stats.expired} 
        color="#ef4444"
      />
      
      <Card 
        label="Ricavo Totale" 
        value={`€ ${stats.totalRevenue.toFixed(2)}`} 
        color="#8b5cf6"
      />
      
      <Card 
        label="Media per Contratto" 
        value={`€ ${stats.avgPrice.toFixed(2)}`} 
        color="#ec4899"
      />
    </div>
  );
};
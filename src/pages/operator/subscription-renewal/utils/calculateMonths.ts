// src/pages/operator/subscription-renewal/utils/calculateMonths.ts
import { formatDate } from '@/pages/operator/Contracts/utils/formatters';

const BLUE = "#4f8cff";

export const calculateAvailableMonths = (contract: any) => {
  const today = new Date();
  
  // Prezzo mensile
  let monthlyPrice = 0;
  if (contract.monthly_price && !isNaN(parseFloat(contract.monthly_price))) {
    monthlyPrice = parseFloat(contract.monthly_price);
  } else if (contract.price && !isNaN(parseFloat(contract.price))) {
    monthlyPrice = parseFloat(contract.price);
  }
  
  // ⭐ LOG: Dati contratto
  console.log('📋 DATI CONTRATTO:', {
    contract_id: contract.id,
    monthly_price: contract.monthly_price,
    price: contract.price,
    monthlyPrice_calculated: monthlyPrice,
    valid_from: contract.valid_from,
    valid_to: contract.valid_to
  });
  
  // Trova ultimo pagamento
  const payments = contract.subscription_payments || [];
  console.log('💰 PAGAMENTI TROVATI:', payments.length);
  
  const hasPreviousPayments = payments.length > 0;
  console.log('💰 PRIMO PAGAMENTO?', hasPreviousPayments ? 'NO (ci sono pagamenti precedenti)' : 'SI (primo pagamento)');
  
  const sortedPayments = [...payments].sort(
    (a: any, b: any) => new Date(b.period_to).getTime() - new Date(a.period_to).getTime()
  );
  const lastPayment = sortedPayments[0];
  
  console.log('📅 ULTIMO PAGAMENTO:', lastPayment ? {
    id: lastPayment.id,
    period_from: lastPayment.period_from,
    period_to: lastPayment.period_to,
    amount: lastPayment.amount,
    payment_date: lastPayment.payment_date
  } : 'NESSUN PAGAMENTO');
  
  let lastPaidDate;
  if (lastPayment && lastPayment.period_to) {
    lastPaidDate = new Date(lastPayment.period_to);
    // Arrotonda all'ultimo giorno del mese
    lastPaidDate = new Date(lastPaidDate.getFullYear(), lastPaidDate.getMonth() + 1, 0);
    console.log('📅 Data ultimo pagato (arrotondata a fine mese):', lastPaidDate.toISOString());
  } else if (contract.valid_from) {
    lastPaidDate = new Date(contract.valid_from);
    lastPaidDate.setDate(1);
    console.log('📅 Nessun pagamento, uso valid_from (arrotondato a inizio mese):', lastPaidDate.toISOString());
  } else {
    lastPaidDate = new Date();
    lastPaidDate.setDate(1);
    console.log('📅 Nessun riferimento, uso primo del mese corrente:', lastPaidDate.toISOString());
  }
  
  const result: any = {
    current: null,
    arrears: [],
    future: []
  };

  // 🔥 DATA DI SCADENZA DEL CONTRATTO
  const contractEndDate = contract.valid_to ? new Date(contract.valid_to) : null;
  console.log('📅 DATA SCADENZA CONTRATTO:', contractEndDate?.toISOString());

  // Calcola giorni nel mese corrente
  const today_date = new Date();
  const currentYear = today_date.getFullYear();
  const currentMonth = today_date.getMonth();
  
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  
  console.log('📅 DATE DI RIFERIMENTO:', {
    oggi: today_date.toISOString(),
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    lastPaidDate: lastPaidDate.toISOString(),
    lastPaidDate_vs_monthStart: lastPaidDate < monthStart ? 'PRIMA' : 'DOPO'
  });
  
  const daysInMonth = monthEnd.getDate();
  
  // ⭐ MESE CORRENTE
  if (lastPaidDate < monthStart) {
    console.log('✅ CONDIZIONE: lastPaidDate < monthStart - SI (mese non pagato)');
    
    if (hasPreviousPayments) {
      result.current = {
        key: `current-${currentMonth}-${currentYear}`,
        label: `${today_date.toLocaleString('it-IT', { month: 'long' })} ${currentYear}`,
        period: `${formatDate(monthStart.toISOString())} - ${formatDate(monthEnd.toISOString())}`,
        periodStart: monthStart.toISOString(),
        periodEnd: monthEnd.toISOString(),
        amount: monthlyPrice,
        isProportional: false,
        color: BLUE
      };
    } else {
      const todayDay = today_date.getDate();
      const remainingDays = daysInMonth - todayDay + 1;
      const proportionalPrice = (monthlyPrice / daysInMonth) * remainingDays;
      
      console.log('💰 PRIMO PAGAMENTO: proporzionale', {
        todayDay,
        daysInMonth,
        remainingDays,
        monthlyPrice,
        proportionalPrice
      });
      
      result.current = {
        key: `current-${currentMonth}-${currentYear}`,
        label: `${today_date.toLocaleString('it-IT', { month: 'long' })} ${currentYear} (dal ${todayDay} al ${daysInMonth})`,
        period: `${formatDate(today_date.toISOString())} - ${formatDate(monthEnd.toISOString())}`,
        periodStart: today_date.toISOString(),
        periodEnd: monthEnd.toISOString(),
        amount: proportionalPrice,
        isProportional: true,
        remainingDays: remainingDays,
        color: BLUE
      };
    }
  } else {
    console.log('❌ CONDIZIONE: lastPaidDate < monthStart - NO (mese già pagato)');
  }

  // 🔥 MESI FUTURI (limitatati dalla data di scadenza del contratto)
  let monthIndex = 0;
  let currentDate = new Date(currentYear, currentMonth + 1, 1);
  
  console.log('📅 INIZIO CALCOLO MESI FUTURI');
  
  while (monthIndex < 24) { // Massimo 24 mesi per sicurezza
    // Se abbiamo una data di scadenza e abbiamo superato, fermati
    if (contractEndDate && currentDate > contractEndDate) {
      console.log(`🛑 Fermato per scadenza contratto: ${currentDate.toISOString()} > ${contractEndDate.toISOString()}`);
      break;
    }
    
    const monthStartFuture = new Date(currentDate);
    const monthEndFuture = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Verifica se questo mese è già stato pagato
    if (monthEndFuture > lastPaidDate) {
      console.log(`✅ Mese futuro ${monthIndex} da pagare:`, currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' }));
      result.future.push({
        key: `future-${currentDate.getMonth()}-${currentDate.getFullYear()}`,
        label: `${currentDate.toLocaleString('it-IT', { month: 'long' })} ${currentDate.getFullYear()}`,
        period: `${formatDate(monthStartFuture.toISOString())} - ${formatDate(monthEndFuture.toISOString())}`,
        periodStart: monthStartFuture.toISOString(),
        periodEnd: monthEndFuture.toISOString(),
        amount: monthlyPrice,
        color: '#10b981'
      });
    } else {
      console.log(`❌ Mese futuro ${monthIndex} già pagato:`, currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' }));
    }
    
    // Passa al mese successivo
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    monthIndex++;
  }

  console.log('🎯 RISULTATO FINALE:', {
    current: result.current ? result.current.label : 'NESSUNO',
    future: result.future.length,
    futureMonths: result.future.map((f: any) => f.label)
  });

  return result;
};
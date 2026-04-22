// src/pages/operator/subscription-renewal/hooks/useCustomerSubscription.ts
import { useState } from 'react';
import { supabase } from '@/services/supabase';

export const useCustomerSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [payments, setPayments] = useState([]);

  const searchCustomer = async (lastName: string) => {
    setLoading(true);
    try {
      console.log('🔍 Cerco cliente con cognome:', lastName);
      
      // 1️⃣ Cerca i clienti
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .ilike('last_name', `%${lastName}%`);

      if (customersError) throw customersError;
      
      console.log('📦 Clienti trovati:', customers?.length || 0);
      
      if (!customers || customers.length === 0) {
        setCustomer(null);
        setPayments([]);
        return [];
      }

      // 2️⃣ Per ogni cliente, cerca i contratti con i relativi template
      const customersWithData = await Promise.all(
        customers.map(async (customer) => {
          // Cerca contratti con i template
          const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select(`
              *,
              template:contract_templates!inner(
                id,
                name,
                type,
                title
              )
            `)
            .eq('customer_id', customer.id)
            .eq('contract_templates.type', 'subscription')
            .order('created_at', { ascending: false });

          if (contractsError) {
            console.error('❌ Errore contratti:', contractsError);
            return { ...customer, contracts: [], customer_vehicles: [] };
          }

          console.log(`📄 Contratti subscription trovati per cliente ${customer.last_name}:`, contracts?.length || 0);

          // 3️⃣ Cerca le subscription per questo cliente
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          console.log(`📅 Subscription trovate per cliente ${customer.last_name}:`, subscriptions?.length || 0);

          // 4️⃣ Per ogni contratto, cerca i pagamenti
          const contractsWithPayments = await Promise.all(
            (contracts || []).map(async (contract) => {
              const { data: subscriptionPayments } = await supabase
                .from('subscription_payments')
                .select('*')
                .eq('subscription_id', subscriptions?.[0]?.id || contract.id)
                .order('payment_date', { ascending: false });

              // 5️⃣ Per ogni pagamento, cerca il metodo
              const paymentsWithMethod = await Promise.all(
                (subscriptionPayments || []).map(async (payment) => {
                  const { data: method } = await supabase
                    .from('payment_methods')
                    .select('*')
                    .eq('id', payment.payment_method_id)
                    .single();
                  
                  return {
                    ...payment,
                    payment_method: method
                  };
                })
              );

              return {
                ...contract,
                subscription_payments: paymentsWithMethod
              };
            })
          );

          // 6️⃣ Cerca i veicoli
          const { data: vehicles, error: vehiclesError } = await supabase
            .from('customer_vehicles')
            .select('plate')
            .eq('customer_id', customer.id);

          if (vehiclesError) {
            console.error('❌ Errore veicoli:', vehiclesError);
          }

          // Recupera i dettagli dei veicoli
          const vehiclesWithDetails = await Promise.all(
            (vehicles || []).map(async (v) => {
              const { data: profile } = await supabase
                .from('vehicle_profiles')
                .select(`
                  brand:vehicle_brands(name),
                  model:vehicle_models(name)
                `)
                .eq('plate', v.plate)
                .maybeSingle();
              
              return {
                plate: v.plate,
                make: profile?.brand?.name || '',
                model: profile?.model?.name || ''
              };
            })
          );

          // 7️⃣ Carica insoluti del cliente
          const { data: outstandingPayments, error: outstandingError } = await supabase
            .from("outstanding_payments")
            .select("*")
            .eq("customer_id", customer.id)
            .eq("tenant_id", customer.tenant_id)
            .eq("status", "open")
            .is("closed_at", null);

          if (outstandingError) {
            console.error("❌ Errore caricamento insoluti:", outstandingError);
          }

          console.log(`💰 Insoluti trovati per cliente ${customer.last_name}:`, outstandingPayments?.length || 0);

          return {
            ...customer,
            contracts: contractsWithPayments,
            subscriptions: subscriptions || [],
            customer_vehicles: vehiclesWithDetails || [],
            outstandings: {
              count: outstandingPayments?.length || 0,
              total: outstandingPayments?.reduce((sum, o) => sum + Number(o.amount || 0), 0),
              items: outstandingPayments || []
            }
          };
        })
      );

      // Filtra solo clienti con contratti subscription
      const filteredCustomers = customersWithData.filter(
        c => c.contracts && c.contracts.length > 0
      );

      console.log('✅ Clienti con abbonamenti:', filteredCustomers.length);
      console.log('💰 Totale insoluti per cliente selezionato:', filteredCustomers[0]?.outstandings?.total || 0);
      
      if (filteredCustomers.length > 0) {
        setCustomer(filteredCustomers[0]);
        setPayments(filteredCustomers[0].contracts[0]?.subscription_payments || []);
        return filteredCustomers;
      } else {
        setCustomer(null);
        setPayments([]);
        return [];
      }
      
    } catch (error) {
      console.error('❌ Errore ricerca cliente:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { searchCustomer, customer, payments, loading };
};
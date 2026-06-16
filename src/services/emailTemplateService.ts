import { supabase } from "@/services/supabase";

// 🔥 ESPORTA L'INTERFACCIA AGGIORNATA CON EVENT_TYPE
export interface EmailTemplate {
  id: string;
  tenant_id: string;
  template_type: string;
  event_type?: string;  // 🔥 NUOVO CAMPO
  subject: string;
  html_body: string;
  text_body?: string;
  available_variables: string[];
  is_active: boolean;
  created_at: string;
}

// Placeholder disponibili per i template
export const AVAILABLE_VARIABLES = [
  { name: 'customer_name', label: 'Nome Cliente', example: 'Mario Rossi' },
  { name: 'plate', label: 'Targa', example: 'AB123CD' },
  { name: 'brand_model', label: 'Marca e Modello', example: 'Fiat Panda' },
  { name: 'wash_service', label: 'Servizio Lavaggio', example: 'Lavaggio Completo' },
  { name: 'amount_paid', label: 'Importo Pagato', example: '12.00' },
  { name: 'wash_date', label: 'Data Lavaggio', example: '30/05/2026 15:03' },
  { name: 'current_washes', label: 'Lavaggi nel ciclo', example: '3' },
  { name: 'remaining_washes', label: 'Lavaggi mancanti', example: '7' },
  { name: 'required_threshold', label: 'Soglia Premio', example: '10' },
  { name: 'percentage', label: 'Percentuale Progresso', example: '30' },
  { name: 'program_name', label: 'Nome Programma', example: 'Fedeltà Auto' },
  { name: 'company_name', label: 'Nome Azienda', example: 'Garage Solution' },
];

// Ottieni tutti i template del tenant
export async function getEmailTemplates(tenantId: string): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Ottieni un template specifico
export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Crea un nuovo template (con event_type)
export async function createEmailTemplate(
  tenantId: string,
  template: Omit<EmailTemplate, 'id' | 'tenant_id' | 'created_at'>
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      tenant_id: tenantId,
      template_type: template.template_type,
      event_type: template.event_type || 'wash_completion',  // 🔥 AGGIUNTO
      subject: template.subject,
      html_body: template.html_body,
      text_body: template.text_body || null,
      available_variables: template.available_variables,
      is_active: template.is_active,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Aggiorna un template esistente (con event_type)
export async function updateEmailTemplate(
  id: string,
  updates: Partial<Omit<EmailTemplate, 'id' | 'tenant_id' | 'created_at'>>
): Promise<EmailTemplate> {
  const updateData: any = {
    template_type: updates.template_type,
    subject: updates.subject,
    html_body: updates.html_body,
    text_body: updates.text_body || null,
    available_variables: updates.available_variables,
    is_active: updates.is_active
  };
  
  // 🔥 AGGIUNGI EVENT_TYPE SE PRESENTE
  if (updates.event_type !== undefined) {
    updateData.event_type = updates.event_type;
  }
  
  const { data, error } = await supabase
    .from('email_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Elimina un template
export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Associa un template a un programma fedeltà
export async function associateTemplateToFidelityProgram(
  fidelityProgramId: string,
  emailTemplateId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('fidelity_programs')
    .update({ email_template_id: emailTemplateId })
    .eq('id', fidelityProgramId);

  if (error) throw error;
}

// Anteprima del template con variabili di esempio
export function previewTemplate(htmlBody: string, variables: Record<string, string>): string {
  let preview = htmlBody;
  Object.entries(variables).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return preview;
}
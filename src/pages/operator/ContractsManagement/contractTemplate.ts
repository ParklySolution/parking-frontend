// File: src/pages/operator/ContractsManagement/contractTemplate.ts
// COPIA QUESTO FILE (adattato dalla creazione)

interface ContractData {
  contract_number: string;
  valid_from: string;
  valid_to: string | null;
  price: number | null;
  duration_months?: number;
  notes?: string;
}

interface CustomerData {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  fiscal_code: string | null;
}

interface CompanyInfo {
  company_name: string;
  address?: string;
  city?: string;
  vat?: string;
}

export function generateContractHTML(
  contract: ContractData,
  customer: CustomerData,
  companyInfo: CompanyInfo,
  templateContent: string = ""
): string {
  
  // Se abbiamo un template salvato, usiamo quello
  if (templateContent) {
    let html = templateContent;
    
    // Sostituisci i placeholder
    html = html.replace(/{{customer_name}}/g, customer.full_name);
    html = html.replace(/{{customer_email}}/g, customer.email || '');
    html = html.replace(/{{customer_phone}}/g, customer.phone || '');
    html = html.replace(/{{customer_fiscal_code}}/g, customer.fiscal_code || '');
    html = html.replace(/{{contract_number}}/g, contract.contract_number);
    html = html.replace(/{{valid_from}}/g, formatDate(contract.valid_from));
    html = html.replace(/{{valid_to}}/g, contract.valid_to ? formatDate(contract.valid_to) : '');
    html = html.replace(/{{price}}/g, contract.price ? `€ ${contract.price}` : '');
    html = html.replace(/{{company_name}}/g, companyInfo.company_name || '');
    html = html.replace(/{{company_address}}/g, companyInfo.address || '');
    html = html.replace(/{{company_city}}/g, companyInfo.city || '');
    html = html.replace(/{{company_vat}}/g, companyInfo.vat || '');
    
    return html;
  }
  
  // Altrimenti usa un template di default
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #4f8cff; margin-bottom: 10px;">CONTRATTO ${contract.contract_number}</h1>
        <h2 style="color: #666; font-size: 18px;">${companyInfo.company_name || 'Park-ly'}</h2>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; border-bottom: 2px solid #4f8cff; padding-bottom: 5px;">Dati Cliente</h3>
        <p><strong>Nome:</strong> ${customer.full_name}</p>
        <p><strong>Email:</strong> ${customer.email || 'N/D'}</p>
        <p><strong>Telefono:</strong> ${customer.phone || 'N/D'}</p>
        <p><strong>Codice Fiscale:</strong> ${customer.fiscal_code || 'N/D'}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; border-bottom: 2px solid #4f8cff; padding-bottom: 5px;">Dettagli Contratto</h3>
        <p><strong>Data inizio:</strong> ${formatDate(contract.valid_from)}</p>
        <p><strong>Data fine:</strong> ${contract.valid_to ? formatDate(contract.valid_to) : 'N/D'}</p>
        <p><strong>Importo:</strong> ${contract.price ? `€ ${contract.price}` : 'N/D'}</p>
        ${contract.duration_months ? `<p><strong>Durata:</strong> ${contract.duration_months} mesi</p>` : ''}
        ${contract.notes ? `<p><strong>Note:</strong> ${contract.notes}</p>` : ''}
      </div>
      
      <div style="margin-top: 50px; text-align: right;">
        <p>Data stampa: ${formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  `;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('it-IT');
  } catch {
    return dateString;
  }
}
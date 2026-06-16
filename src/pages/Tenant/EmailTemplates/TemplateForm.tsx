import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { 
  getEmailTemplate, 
  createEmailTemplate, 
  updateEmailTemplate,
  AVAILABLE_VARIABLES,
  previewTemplate
} from '@/services/emailTemplateService';
import { FaSave, FaEye, FaArrowLeft, FaCode } from 'react-icons/fa';

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";

// 🔥 OPZIONI PER I TIPI DI EVENTO
const EVENT_TYPE_OPTIONS = [
  { value: 'wash_completion', label: '🧼 Lavaggio Completato', description: 'Inviata dopo ogni lavaggio (normale)', icon: '🧼' },
  { value: 'reward_earned', label: '🏆 Premio Raggiunto', description: 'Inviata quando si raggiunge la soglia (10° lavaggio)', icon: '🏆' },
  { value: 'free_wash_used', label: '🎁 Lavaggio Gratuito Usato', description: 'Inviata quando si utilizza il premio (11° lavaggio)', icon: '🎁' },
];

export default function TemplateForm() {
  const navigate = useNavigate();
  const { tenantId, id } = useParams();
  const isEditing = id && id !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    template_type: 'wash_completion',
    event_type: 'wash_completion',  // 🔥 NUOVO CAMPO
    subject: '',
    html_body: '',
    text_body: '',
    available_variables: [] as string[],
    is_active: true
  });

  useEffect(() => {
    if (isEditing && tenantId) {
      loadTemplate();
    }
  }, [id, tenantId]);

  const loadTemplate = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const template = await getEmailTemplate(id);
      if (template) {
        setFormData({
          template_type: template.template_type,
          event_type: template.event_type || 'wash_completion',  // 🔥 LEGGI EVENT_TYPE
          subject: template.subject,
          html_body: template.html_body,
          text_body: template.text_body || '',
          available_variables: template.available_variables || [],
          is_active: template.is_active
        });
      }
    } catch (error) {
      console.error('Errore caricamento template:', error);
      alert('Errore durante il caricamento del template');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    try {
      const templateData = {
        template_type: formData.template_type,
        event_type: formData.event_type,  // 🔥 SALVA EVENT_TYPE
        subject: formData.subject,
        html_body: formData.html_body,
        text_body: formData.text_body || null,
        available_variables: formData.available_variables,
        is_active: formData.is_active
      };

      if (isEditing && id) {
        await updateEmailTemplate(id, templateData);
      } else {
        await createEmailTemplate(tenantId, templateData);
      }
      navigate(`/tenant/${tenantId}/management/email-templates`);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio del template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (varName: string) => {
    setFormData(prev => ({
      ...prev,
      html_body: prev.html_body + ` {{${varName}}} `
    }));
  };

  // 🔥 ANTEVISTA CON DATI SPECIFICI PER TIPO EVENTO
  const previewHtml = () => {
    let sampleData: Record<string, string> = {
      customer_name: 'Mario Rossi',
      plate: 'AB123CD',
      brand_model: 'Fiat Panda',
      wash_service: 'Lavaggio Completo',
      amount_paid: '12.00',
      wash_date: new Date().toLocaleString('it-IT'),
      current_washes: '3',
      remaining_washes: '7',
      required_threshold: '10',
      percentage: '30',
      program_name: 'Fedeltà Auto',
      company_name: 'Garage Solution',
      is_reward_earned: 'false',
      is_free_wash: 'false'
    };

    // 🔥 ADATTA L'ANTEPRIMA IN BASE AL TIPO EVENTO
    if (formData.event_type === 'reward_earned') {
      sampleData = {
        ...sampleData,
        current_washes: '10',
        remaining_washes: '0',
        percentage: '100',
        is_reward_earned: 'true',
        amount_paid: '12.00'
      };
    } else if (formData.event_type === 'free_wash_used') {
      sampleData = {
        ...sampleData,
        is_free_wash: 'true',
        amount_paid: '0.00'
      };
    }

    return previewTemplate(formData.html_body, sampleData);
  };

  const getTemplateTypeOptions = () => {
  return [
    { value: 'wash_completion', label: '🧼 Lavaggio Completato', description: 'Inviata dopo ogni lavaggio normale' },
    { value: 'fidelity_wash', label: '🏆 Fedeltà - Lavaggio', description: 'Inviata per programmi fedeltà' },
    { value: 'fidelity_progress', label: '📊 Progresso Fedeltà', description: 'Aggiornamento progresso' },
    { value: 'reward_unlocked', label: '🎁 Premio Sbloccato', description: 'Premio raggiunto' },
    { value: 'reward_earned', label: '🏆 Premio Raggiunto', description: 'Premio ottenuto' },
    { value: 'free_wash_used', label: '🎁 Lavaggio Gratuito Usato', description: 'Premio consumato' },
    { value: 'expiry_reminder', label: '⏰ Promemoria Scadenza', description: 'Scadenza imminente' },
  ];
};

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
        Caricamento template...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`/tenant/${tenantId}/management/email-templates`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: BLUE,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaArrowLeft /> Indietro
        </button>
        <h1 style={{ color: '#fff' }}>
          {isEditing ? 'Modifica Template Email' : 'Nuovo Template Email'}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '24px' }}>
        <form onSubmit={handleSubmit} style={{ background: BG_DARK, padding: '24px', borderRadius: '12px' }}>
          
          {/* 🔥 NUOVO CAMPO: TIPO EVENTO */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Tipo Evento *</label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1f25',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff'
              }}
            >
              {EVENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Scegli quando questa email deve essere inviata.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Tipo Template (legacy) *</label>
            <select
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1f25',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff'
              }}
            >
              {getTemplateTypeOptions().map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Oggetto *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              placeholder="Es: 🧼 {{wash_service}} completato su {{brand_model}}"
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1f25',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
              Contenuto HTML * (supporta placeholder {"{{variabile}}"})
            </label>
            <textarea
              value={formData.html_body}
              onChange={(e) => setFormData({ ...formData, html_body: e.target.value })}
              required
              rows={15}
              placeholder={
                formData.event_type === 'reward_earned' 
                  ? '<div style="font-family: Arial, sans-serif;">\n  <h2>🎉 CONGRATULAZIONI {{customer_name}}! 🎉</h2>\n  <p>Hai raggiunto {{required_threshold}} lavaggi!</p>\n  <p>🎁 Il tuo prossimo lavaggio è GRATUITO!</p>\n</div>'
                  : formData.event_type === 'free_wash_used'
                  ? '<div style="font-family: Arial, sans-serif;">\n  <h2>🎉 COMPLIMENTI {{customer_name}}! 🎉</h2>\n  <p>Hai utilizzato il tuo lavaggio gratuito su {{brand_model}} ({{plate}}).</p>\n  <p>💰 Risparmiato: €{{amount_paid}}</p>\n</div>'
                  : '<div style="font-family: Arial, sans-serif;">\n  <h2>Ciao {{customer_name}}!</h2>\n  <p>Il tuo {{wash_service}} su {{brand_model}} ({{plate}}) è stato completato.</p>\n  <p>🏆 Progresso: {{current_washes}}/{{required_threshold}} ({{percentage}}%)</p>\n</div>'
              }
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1f25',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
              <FaCode style={{ marginRight: '4px' }} /> Variabili disponibili
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {AVAILABLE_VARIABLES.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  style={{
                    padding: '4px 10px',
                    background: '#1a1f25',
                    border: `1px solid ${formData.available_variables.includes(v.name) ? BLUE : '#333'}`,
                    borderRadius: '16px',
                    color: formData.available_variables.includes(v.name) ? BLUE : '#9ca3af',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title={`${v.label} - Esempio: ${v.example}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
              💡 Clicca su una variabile per inserirla nel testo. Verrà sostituita automaticamente con il valore reale.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Template Attivo
            </label>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', marginLeft: '22px' }}>
              Solo i template attivi verranno utilizzati per l'invio delle email.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: `1px solid ${BLUE}`,
                borderRadius: '8px',
                color: BLUE,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaEye /> {showPreview ? 'Nascondi Anteprima' : 'Mostra Anteprima'}
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: BLUE,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: saving ? 0.5 : 1
              }}
            >
              <FaSave /> {saving ? 'Salvataggio...' : 'Salva Template'}
            </button>
          </div>
        </form>

        {showPreview && (
          <div style={{ background: BG_DARK, padding: '24px', borderRadius: '12px', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px' }}>📧 Anteprima Email</h3>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px' }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml() }} />
            </div>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '12px' }}>
              ⚠️ L'anteprima utilizza dati di esempio. Nel messaggio reale verranno inseriti i dati reali del cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
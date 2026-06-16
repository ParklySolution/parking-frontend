import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { getEmailTemplates, deleteEmailTemplate } from '@/services/emailTemplateService';
import type { EmailTemplate } from '@/services/emailTemplateService';
import { FaPlus, FaEdit, FaTrash, FaEnvelope } from 'react-icons/fa';

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";

export default function EmailTemplates() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadTemplates();
    }
  }, [tenantId]);

  const loadTemplates = async () => {
    if (!tenantId) return;
    try {
      const data = await getEmailTemplates(tenantId);
      setTemplates(data);
    } catch (error) {
      console.error('Errore caricamento template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo template?')) {
      try {
        await deleteEmailTemplate(id);
        setTemplates(templates.filter(t => t.id !== id));
      } catch (error) {
        console.error('Errore eliminazione:', error);
        alert('Errore durante l\'eliminazione');
      }
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'wash_completion': return '🧼 Lavaggio Completato';
      case 'fidelity_wash': return '🏆 Fedeltà - Lavaggio';
      case 'reward_earned': return '🎁 Premio Raggiunto';
      default: return '📧 Generico';
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaEnvelope color={BLUE} /> Template Email
        </h1>
        <button
          onClick={() => navigate(`/tenant/${tenantId}/management/email-templates/new`)}
          style={{
            background: BLUE,
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold'
          }}
        >
          <FaPlus /> Nuovo Template
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {templates.map(template => (
          <div
            key={template.id}
            style={{
              background: BG_DARK,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${template.is_active ? BLUE : '#333'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: BLUE, marginBottom: '4px' }}>
                  {getTemplateTypeLabel(template.template_type)}
                </div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>{template.subject}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/tenant/${tenantId}/management/email-templates/edit/${template.id}`)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: BLUE,
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            <div style={{ 
              fontSize: '12px', 
              color: '#9ca3af',
              marginBottom: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {template.html_body.substring(0, 100)}...
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: template.is_active ? '#10b98120' : '#ef444420',
                color: template.is_active ? '#10b981' : '#ef4444'
              }}>
                {template.is_active ? '✅ Attivo' : '❌ Disattivato'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: BG_DARK,
          borderRadius: '12px',
          color: '#9ca3af'
        }}>
          <FaEnvelope size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Nessun template email configurato</p>
          <p style={{ fontSize: '12px' }}>Clicca su "Nuovo Template" per iniziare</p>
        </div>
      )}
    </div>
  );
}
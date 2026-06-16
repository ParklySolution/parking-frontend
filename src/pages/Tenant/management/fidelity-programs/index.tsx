// src/pages/Tenant/management/fidelity-programs/index.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from "react-icons/fa";
import FidelityProgramForm from "./FidelityProgramForm";

interface FidelityProgram {
  id: string;
  name: string;
  required_actions: number;
  reward_description: string;
  service_id: string;
  is_active: boolean;
  created_at: string;
}

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

export default function FidelityProgramsList() {
  const { tenantId } = useParams();
  const [programs, setPrograms] = useState<FidelityProgram[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<FidelityProgram | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  async function fetchData() {
    if (!tenantId) return;
    setLoading(true);

    // Carica programmi fedeltà
    const { data: programsData } = await supabase
      .from("fidelity_programs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    // Carica servizi da wash_service_catalog
const { data: servicesData } = await supabase
  .from("wash_service_catalog")
  .select("id, name")
  .eq("tenant_id", tenantId)
  .eq("is_active", true);

    setPrograms(programsData || []);
    setServices(servicesData || []);
    setLoading(false);
  }

  async function toggleActive(program: FidelityProgram) {
    const { error } = await supabase
      .from("fidelity_programs")
      .update({ is_active: !program.is_active })
      .eq("id", program.id);

    if (!error) {
      fetchData();
    }
  }

  async function deleteProgram(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo programma fedeltà?")) return;

    const { error } = await supabase
      .from("fidelity_programs")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchData();
    }
  }

  function handleEdit(program: FidelityProgram) {
    setEditingProgram(program);
    setShowForm(true);
  }

  function handleNew() {
    setEditingProgram(null);
    setShowForm(true);
  }

  function getServiceName(serviceId: string): string {
    const service = services.find(s => s.id === serviceId);
    return service?.name || "Servizio non trovato";
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento programmi fedeltà...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: BLUE }}>
          🎁 Programmi Fedeltà
        </h1>
        
        <button
          onClick={handleNew}
          style={{
            background: BLUE,
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <FaPlus /> Nuovo programma
        </button>
      </div>

      {/* Lista programmi */}
      {programs.length === 0 ? (
        <div style={{
          background: BG_DARK,
          padding: "60px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#9ca3af"
        }}>
          Nessun programma fedeltà trovato. Crea il primo programma!
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "20px"
        }}>
          {programs.map((program) => (
            <div
              key={program.id}
              style={{
                background: BG_DARK,
                borderRadius: "12px",
                padding: "20px",
                border: `1px solid ${program.is_active ? BLUE : "#333"}`,
                transition: "all 0.2s"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "15px"
              }}>
                <h3 style={{ color: BLUE, margin: 0, fontSize: "18px" }}>
                  {program.name}
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleEdit(program)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: BLUE,
                      cursor: "pointer",
                      padding: "4px"
                    }}
                    title="Modifica"
                  >
                    <FaEdit size={16} />
                  </button>
                  <button
                    onClick={() => toggleActive(program)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: program.is_active ? "#10b981" : "#9ca3af",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                    title={program.is_active ? "Disattiva" : "Attiva"}
                  >
                    {program.is_active ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                  </button>
                  <button
                    onClick={() => deleteProgram(program.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                    title="Elimina"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ color: "#9ca3af" }}>Regola:</span>
                  <span style={{ color: "#fff" }}>
                    {program.required_actions} lavaggi = {program.reward_description}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#9ca3af" }}>Servizio:</span>
                  <span style={{ color: "#fff" }}>{getServiceName(program.service_id)}</span>
                </div>
              </div>

              <div style={{
                marginTop: "12px",
                padding: "8px",
                background: program.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                borderRadius: "6px",
                textAlign: "center"
              }}>
                <span style={{ color: program.is_active ? "#10b981" : "#ef4444", fontSize: "12px" }}>
                  {program.is_active ? "● Attivo" : "● Disattivo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <FidelityProgramForm
          tenantId={tenantId!}
          program={editingProgram}
          services={services}
          onClose={() => {
            setShowForm(false);
            setEditingProgram(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
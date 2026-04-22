import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPlan } from "@/services/superAdminService";
import "@/styles/superadmin.css";

export default function PlanCreatePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [limits, setLimits] = useState("{}");
  const [features, setFeatures] = useState("{}");

  async function handleSave() {
    try {
      const newId = await createPlan(
        name,
        description,
        Number(price),
        JSON.parse(limits),
        JSON.parse(features)
      );

      alert("Piano creato con successo");
      navigate(`/super/plans/${newId}`);
    } catch (err) {
      console.error("Errore creazione piano:", err);
      alert("Errore durante la creazione del piano");
    }
  }

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Crea nuovo piano</h1>

      <div className="sa-card" style={{ maxWidth: "600px" }}>
        <label>Nome</label>
        <input className="sa-input" value={name} onChange={(e) => setName(e.target.value)} />

        <label>Descrizione</label>
        <textarea className="sa-input" value={description} onChange={(e) => setDescription(e.target.value)} />

        <label>Prezzo (€/mese)</label>
        <input className="sa-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />

        <label>Limiti (JSON)</label>
        <textarea className="sa-input" value={limits} onChange={(e) => setLimits(e.target.value)} />

        <label>Feature incluse (JSON)</label>
        <textarea className="sa-input" value={features} onChange={(e) => setFeatures(e.target.value)} />

        <button className="sa-btn sa-btn-primary" onClick={handleSave}>
          Crea piano
        </button>
      </div>
    </div>
  );
}

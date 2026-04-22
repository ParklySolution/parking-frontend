import { useDashboardStore } from "../../store/useDashboardStore";

export default function HeaderActions() {
  const plates = useDashboardStore((s) => s.plates);
  const addTransit = useDashboardStore((s) => s.addTransit);

  const handleEntry = () => {
    if (!plates[0]) return;

    addTransit({
      id: crypto.randomUUID(),
      plate: plates[0].plate,
      reason: "Ingresso manuale",
      time: new Date().toISOString(),
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleEntry}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Entrata
      </button>

      <button className="bg-red-600 text-white px-4 py-2 rounded">
        Uscita
      </button>
    </div>
  );
}

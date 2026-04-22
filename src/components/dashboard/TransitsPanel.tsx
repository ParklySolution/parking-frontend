import { useDashboardStore } from "../../store/useDashboardStore";

export default function TransitsPanel() {
  const transits = useDashboardStore((s) => s.transits);

  return (
    <div className="bg-gray-900 text-white p-4 rounded">
      <h2 className="font-bold mb-2">🚦 Transiti</h2>

      {transits.length === 0 && (
        <p className="text-gray-400 text-sm">Nessun transito</p>
      )}

      <ul className="space-y-2">
        {transits.map((t) => (
          <li key={t.id} className="bg-gray-800 p-2 rounded">
            <div className="font-semibold">{t.plate}</div>
            <div className="text-xs text-gray-400">{t.reason}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

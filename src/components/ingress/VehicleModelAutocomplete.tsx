import { useEffect, useState } from "react";
import { searchVehicleModels } from "@/services/vehicleModelsService";

type Props = {
  tenantId: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (model: any) => void;
};

export default function VehicleModelAutocomplete({
  tenantId,
  value,
  onChange,
  onSelect,
}: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (value.length < 2) {
        setResults([]);
        return;
      }

      const data = await searchVehicleModels(tenantId, value);
      setResults(data);
      setOpen(true);
    };

    run();
  }, [value]);

  return (
    <div className="autocomplete">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Inizia a digitare..."
      />

      {open && results.length > 0 && (
        <ul className="autocomplete-list">
          {results.map((m) => (
            <li
              key={m.id}
              onClick={() => {
                onSelect(m);
                setOpen(false);
              }}
            >
              {m.name} — {m.vehicle_brands.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

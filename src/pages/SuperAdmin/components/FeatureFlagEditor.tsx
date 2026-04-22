import React, { useState } from "react";
import type { FeatureFlags } from "@/types/superadmin";

interface Props {
  initialFlags: FeatureFlags;
  onSave: (flags: FeatureFlags) => void;
}

export const FeatureFlagEditor: React.FC<Props> = ({
  initialFlags,
  onSave,
}) => {
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags);

  const toggle = (key: string) => {
    setFlags({ ...flags, [key]: !flags[key] });
  };

  return (
    <div className="card">
      <h3>Moduli attivi</h3>

      {Object.keys(flags).map((key) => (
        <label key={key} style={{ display: "block", marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={!!flags[key]}
            onChange={() => toggle(key)}
          />
          {key}
        </label>
      ))}

      <button type="button" onClick={() => onSave(flags)}>
        Salva
      </button>
    </div>
  );
};

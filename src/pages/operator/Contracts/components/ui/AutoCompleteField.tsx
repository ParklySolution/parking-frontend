// src/pages/operator/Contracts/components/ui/AutoCompleteField.tsx
import React, { useState, useEffect } from "react";
import { BG_DARK, BG_LIGHTER } from "../../constants";

interface AutoCompleteFieldProps {
  label: string;
  value: string;                     // testo mostrato nell’input
  onChange: (value: string) => void; // aggiorna il testo
  onSelect?: (item: any) => void;    // passa l’oggetto selezionato (ID incluso)
  suggestions: any[];
  suggestionKey?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const AutoCompleteField: React.FC<AutoCompleteFieldProps> = ({
  label,
  value,
  onChange,
  onSelect,
  suggestions,
  suggestionKey = "name",
  disabled,
  placeholder,
  required
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

  // LOG
  console.log(`🔍 AutoComplete [${label}] - suggestions ricevute:`, suggestions);
  console.log(`🔍 AutoComplete [${label}] - value:`, value);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(item =>
        item[suggestionKey]?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
  }, [value, suggestions, suggestionKey]);

  const handleSelect = (item: any) => {
    console.log(`🔍 AutoComplete [${label}] - selezionato:`, item);

    // Mostra il nome nell’input
    onChange(item[suggestionKey]);

    // Passa l’intero oggetto al parent (che userà item.id)
    if (onSelect) onSelect(item);

    setShowSuggestions(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <label style={{ color: "#9ca3af", fontSize: "12px", display: "block", marginBottom: "4px" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)} // aggiorna solo il testo
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: disabled ? "#2a2a2a" : BG_LIGHTER,
          border: "1px solid #333",
          borderRadius: "6px",
          color: "#fff",
          fontSize: "14px",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text"
        }}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          maxHeight: "200px",
          overflowY: "auto",
          background: BG_DARK,
          border: "1px solid #333",
          borderRadius: "6px",
          marginTop: "4px",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          {filteredSuggestions.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSelect(item)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: index < filteredSuggestions.length - 1 ? "1px solid #333" : "none",
                color: "#fff",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = BG_LIGHTER}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {item[suggestionKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

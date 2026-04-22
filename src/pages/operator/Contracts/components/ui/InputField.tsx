// src/pages/operator/Contracts/components/ui/InputField.tsx
import React from "react";
import { BG_LIGHTER } from "../../constants";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
  textarea?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  required,
  type = "text",
  min,
  max,
  step,
  placeholder,
  textarea,
  disabled,
  style
}) => {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: disabled ? "#2a2a2a" : BG_LIGHTER,
    border: "1px solid #333",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "text",
    ...style
  };

  return (
    <div>
      <label style={{ color: "#9ca3af", fontSize: "12px", display: "block", marginBottom: "4px" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={disabled}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
        />
      )}
    </div>
  );
};
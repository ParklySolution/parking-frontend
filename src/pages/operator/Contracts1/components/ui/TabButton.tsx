// src/pages/operator/Contracts/components/ui/TabButton.tsx
import React from "react";
import { BLUE } from "../../constants";

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    style={{
      padding: "12px 24px",
      background: active ? BLUE : "transparent",
      color: active ? "#fff" : "#9ca3af",
      border: "none",
      borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
      cursor: "pointer",
      fontWeight: active ? 600 : 400,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease"
    }}
  >
    {icon && <span style={{ fontSize: "16px" }}>{icon}</span>}
    <span>{label}</span>
  </button>
);
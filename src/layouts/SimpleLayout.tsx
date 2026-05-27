// src/layouts/SimpleLayout.tsx
import { Outlet } from "react-router-dom";
import { BG_DARK } from "@/pages/operator/Contracts/constants";

export default function SimpleLayout() {
  return (
    <div style={{ minHeight: "100vh", background: BG_DARK }}>
      <main style={{ padding: "20px" }}>
        <Outlet />
      </main>
    </div>
  );
}
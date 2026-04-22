import { Outlet } from "react-router-dom";
import TenantSidebar from "./TenantSidebar";
import TenantHeader from "./TenantHeader";

export default function TenantLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0f12" }}>
      
      {/* Sidebar */}
      <TenantSidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <TenantHeader />

        {/* Page content */}
        <div style={{ padding: "30px", overflowY: "auto" }}>
          <Outlet />
        </div>

      </div>
    </div>
  );
}
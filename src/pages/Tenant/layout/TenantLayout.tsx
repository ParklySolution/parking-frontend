import { Outlet, useParams } from "react-router-dom";
import TenantSidebar from "./TenantSidebar";
import TenantHeader from "./TenantHeader";

export default function TenantLayout() {
  const { tenantId } = useParams(); // 🔥 Prende tenantId dalla URL
  
  console.log("🏢 [TenantLayout] tenantId:", tenantId);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0f12" }}>
      
      {/* Sidebar */}
      <TenantSidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* 🔥 Passa tenantId come prop al Header */}
        <TenantHeader tenantId={tenantId} />

        {/* Page content */}
        <div style={{ padding: "30px", overflowY: "auto" }}>
          <Outlet />
        </div>

      </div>
    </div>
  );
}
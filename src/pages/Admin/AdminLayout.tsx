import { Outlet, useParams } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  const { tenantId } = useParams(); // ⭐ tenantId dalla URL

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#111418" }}>
      <AdminSidebar tenantId={tenantId} />

      <main
        style={{
          flex: 1,
          padding: "24px",
          background: "#111418",
          color: "#fff",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet, NavLink } from "react-router-dom";
import "@/styles/superadmin.css";

export default function SuperAdminLayout() {
  return (
    <div className="superadmin-container">
      
      {/* SIDEBAR */}
      <aside className="superadmin-sidebar">
        <h2 className="superadmin-title">Super Admin</h2>

        <nav className="superadmin-nav">
          <NavLink to="/super" end className="sa-link">
            Dashboard
          </NavLink>

          {/* ⭐ Admins */}
          <NavLink to="/super/admins" className="sa-link">
            Admins
          </NavLink>

          {/* ⭐ NEW: Companies */}
          <NavLink to="/super/companies" className="sa-link">
            Companies
          </NavLink>

          {/* Tenants */}
          <NavLink to="/super/tenants" className="sa-link">
            Tenants
          </NavLink>

          {/* Piani */}
          <NavLink to="/super/plans" className="sa-link">
            Piani
          </NavLink>

          <NavLink to="/super/plans/manage" className="sa-link">
            Gestione Piani
          </NavLink>

          {/* Feature Flags */}
          <NavLink to="/super/feature-flags" className="sa-link">
            Feature Flags
          </NavLink>

          {/* Impersonation */}
          <NavLink to="/super/impersonate" className="sa-link">
            Impersonation
          </NavLink>

          {/* Audit Log */}
          <NavLink to="/super/logs" className="sa-link">
            Logs
          </NavLink>
        </nav>
      </aside>

      {/* CONTENUTO */}
      <main className="superadmin-content">
        <Outlet />
      </main>
    </div>
  );
}

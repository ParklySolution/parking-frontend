import { Outlet, NavLink } from "react-router-dom";
import { 
  FaTachometerAlt,
  FaBuilding,
  FaStore,
  FaTags,
  FaCog,
  FaGlobe,
  FaList,
  FaFlag,
  FaHistory,
  FaSyncAlt
} from "react-icons/fa";
import "@/styles/superadmin.css";

export default function SuperAdminLayout() {
  return (
    <div className="superadmin-container">
      
      {/* SIDEBAR */}
      <aside className="superadmin-sidebar">
        <div style={{ marginBottom: "32px", padding: "0 12px" }}>
          <h2 style={{ 
            color: "#fff", 
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: "4px",
          }}>
            Super Admin
          </h2>
          <div style={{ 
            height: "2px", 
            width: "40px", 
            background: "#4f8cff",
            borderRadius: "2px",
          }} />
        </div>

        <nav className="superadmin-nav">
          <NavLink to="/super" end className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaTachometerAlt className="icon" />
            Dashboard
          </NavLink>

          <NavLink to="/super/companies" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaBuilding className="icon" />
            Companies
          </NavLink>

          <NavLink to="/super/tenants" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaStore className="icon" />
            Tenants
          </NavLink>

          <NavLink to="/super/plans" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaTags className="icon" />
            Piani
          </NavLink>

          <NavLink to="/super/plans/manage" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaCog className="icon" />
            Gestione Piani
          </NavLink>
        </nav>

        {/* Gestione dati globali */}
        <div className="management-section">
          <div className="section-title">Dati Globali</div>

          <NavLink to="/super/global-brands" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaGlobe className="icon" />
            Marche Globali
          </NavLink>

          <NavLink to="/super/global-categories" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaList className="icon" />
            Categorie Globali
          </NavLink>

          <NavLink to="/super/global-models" className="sa-link">
            Modelli Globali
          </NavLink>

          <NavLink to="/super/models-sync" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaSyncAlt className="icon" />
            Sincronizza Modelli
          </NavLink>
        </div>

        {/* Sistema */}
        <div className="management-section">
          <div className="section-title">Sistema</div>

          <NavLink to="/super/feature-flags" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaFlag className="icon" />
            Feature Flags
          </NavLink>

          <NavLink to="/super/logs" className={({ isActive }) => `sa-link ${isActive ? 'active' : ''}`}>
            <FaHistory className="icon" />
            Audit Log
          </NavLink>
        </div>
      </aside>

      {/* CONTENUTO */}
      <main className="superadmin-content">
        <Outlet />
      </main>
    </div>
  );
}
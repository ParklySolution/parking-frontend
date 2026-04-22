import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaTag,
  FaList,
  FaCarSide,
  FaEuroSign,
  FaClock,
  FaSoap
} from "react-icons/fa";
import "./admin-sidebar.css";

export default function AdminSidebar({ tenantId }: { tenantId?: string }) {
  return (
    <div className="admin-sidebar">
      {/* Header */}
      <div style={{ marginBottom: "32px", padding: "0 12px" }}>
        <h2
          style={{
            color: "#fff",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: "4px",
          }}
        >
          Admin Panel
        </h2>
        <div
          style={{
            height: "2px",
            width: "40px",
            background: "#4f8cff",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav>
        <NavLink
          to={`/admin/${tenantId}`}
          end
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaTachometerAlt className="icon" />
          Dashboard
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/brands`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaTag className="icon" />
          Marche
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/categories`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaList className="icon" />
          Categorie
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/models`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaCarSide className="icon" />
          Modelli
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/price-lists`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaEuroSign className="icon" />
          Listini
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/tolerances`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaClock className="icon" />
          Tolleranze
        </NavLink>

        <NavLink
          to={`/admin/${tenantId}/wash-services`}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <FaSoap className="icon" />
          Lavaggi
        </NavLink>
      </nav>
    </div>
  );
}

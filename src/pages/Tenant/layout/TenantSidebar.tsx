import { NavLink, useParams } from "react-router-dom";
import { 
  FaTachometerAlt,
  FaCar,
  FaMoneyBillWave,
  FaUsers,
  FaUserTie,
  FaTag,
  FaList,
  FaCarSide,
  FaEuroSign,
  FaClock,
  FaSoap,
  FaFileContract,
  FaGift,
  FaFileSignature,
  FaBuilding,
  FaUserCog,
  FaCreditCard
} from "react-icons/fa";
import "./TenantSidebar.css";

export default function TenantSidebar() {
  const { tenantId } = useParams<{ tenantId: string }>();

  return (
    <div className="tenant-sidebar">
      {/* Logo / Header */}
      <div style={{ marginBottom: "32px", padding: "0 12px" }}>
        <h2 style={{ 
          color: "#fff", 
          fontSize: "20px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}>
          Tenant Panel
        </h2>
        <div style={{ 
          height: "2px", 
          width: "40px", 
          background: "#4f8cff",
          borderRadius: "2px",
        }} />
      </div>

      {/* Navigation Links */}
      <nav>
        <NavLink
          to={`/tenant/${tenantId}/dashboard`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaTachometerAlt className="icon" />
          Dashboard
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/ingressi`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaCar className="icon" />
          Ingressi
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/uscite`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaMoneyBillWave className="icon" />
          Uscite
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/abbonamenti`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaUsers className="icon" />
          Abbonamenti
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/abbonati`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaUserCog className="icon" />
          Gestione Abbonati
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/clienti`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaUserTie className="icon" />
          Clienti
        </NavLink>
      </nav>

      {/* Management Section */}
      <div className="management-section">
        <div className="section-title">Gestione</div>

        <NavLink
          to={`/tenant/${tenantId}/management/company-info`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaBuilding className="icon" />
          Dati Aziendali
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/brands`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaTag className="icon" />
          Marche
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/categories`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaList className="icon" />
          Categorie
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/models`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaCarSide className="icon" />
          Modelli
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/price-lists`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaEuroSign className="icon" />
          Listini
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/tolerances`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaClock className="icon" />
          Tolleranze
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/wash-services`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaSoap className="icon" />
          Lavaggi
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/conventions`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaFileContract className="icon" />
          Convenzioni
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/wash-bonus`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaGift className="icon" />
          Bonus Lavaggio
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/contract-templates`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaFileSignature className="icon" />
          Modelli Contratto
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/payment-methods`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaCreditCard className="icon" />
          Metodi Pagamento
        </NavLink>

        <NavLink
          to={`/tenant/${tenantId}/management/contract-terms`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaFileContract className="icon" />
          Termini Contrattuali
        </NavLink>

        {/* Gestione Utenti */}
        <NavLink
          to={`/tenant/${tenantId}/management/users`}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FaUserCog className="icon" />
          Gestione Utenti
        </NavLink>

      </div>
    </div>
  );
}
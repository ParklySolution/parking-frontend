import { Outlet, NavLink, useLocation } from "react-router-dom";

export default function AppLayout() {
  const location = useLocation();
  
  // Nascondi sidebar in dashboard, ingresso e exit
  const hideSidebar = [
    "/", 
    "/dashboard", 
    "/ingresso", 
    "/exit"
  ].includes(location.pathname);

  // ⭐ Controllo impersonation
  const impersonationToken = localStorage.getItem("impersonation_token");
  const impersonatedTenant = localStorage.getItem("impersonation_tenant_name");

  function exitImpersonation() {
    localStorage.removeItem("impersonation_token");
    localStorage.removeItem("impersonation_tenant_name");
    window.location.href = "/super";
  }

  return (
    <div className={`min-h-screen bg-gray-100 flex ${hideSidebar ? "" : ""}`}>

      {/* ⭐ Banner impersonation */}
      {impersonationToken && (
        <div className="w-full bg-red-700 text-white px-6 py-3 flex justify-between items-center">
          <span>
            Stai impersonando il tenant: <strong>{impersonatedTenant ?? "Sconosciuto"}</strong>
          </span>
          <button
            onClick={exitImpersonation}
            className="bg-white text-red-700 px-3 py-1 rounded font-semibold"
          >
            Torna Super Admin
          </button>
        </div>
      )}

      {/* Sidebar - visibile solo se NON siamo in hideSidebar */}
      {!hideSidebar && (
        <aside className="w-64 bg-white shadow-lg">
          {/* <div className="p-4 font-bold text-xl border-b">Parking Labs</div> */}

          <nav className="p-4 space-y-2">
            <NavLink
              to="/ingresso"
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${
                  isActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`
              }
            >
              Ingresso
            </NavLink>

            <NavLink
              to="/exit"
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${
                  isActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`
              }
            >
              Uscita
            </NavLink>

            <NavLink
              to="/subscriptions"
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${
                  isActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`
              }
            >
              Abbonamenti
            </NavLink>

            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${
                  isActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`
              }
            >
              Clienti
            </NavLink>
          </nav>
        </aside>
      )}

      {/* Main content */}
      <main className={`${!hideSidebar ? "flex-1 p-6 bg-gray-50" : "w-full"}`}>
        <Outlet />
      </main>
    </div>
  );
}
import TenantLayout from "./layout/TenantLayout";

export default function TenantApp() {
  return (
    <TenantLayout>
      <h1 style={{ color: "#fff", fontSize: "26px" }}>Dashboard Tenant</h1>
      <p style={{ color: "#aaa", marginTop: "10px" }}>
        Qui costruiremo i moduli del tenant (Ingressi, Uscite, Abbonamenti, Clienti…)
      </p>
    </TenantLayout>
  );
}

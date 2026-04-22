export default function LoaderOverlay() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        padding: "20px 30px",
        background: "#fff",
        borderRadius: "10px",
        fontSize: "18px",
        fontWeight: "600",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
      }}>
        Caricamento...
      </div>
    </div>
  );
}

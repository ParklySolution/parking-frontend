// src/components/exit/TicketExitModal.tsx

import { useState, useRef, useEffect } from "react";
import { FaTicketAlt, FaQrcode, FaTimes, FaArrowRight, FaCamera } from "react-icons/fa";
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onClose: () => void;
  onConfirm: (ticketNumber: number) => void;
}

export default function TicketExitModal({ onClose, onConfirm }: Props) {
  const [ticket, setTicket] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Colori professionali
  const BLUE = "#2563eb";
  const DARK_BG = "#0f172a";
  const MODAL_BG = "#1e293b";
  const INPUT_BG = "#334155";
  const BORDER_COLOR = "#475569";

  // Ferma lo scanner quando il componente si smonta
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  const startScanner = () => {
    setShowScanner(true);
    setScannerError(null);
    
    setTimeout(() => {
      if (scannerContainerRef.current && !qrScannerRef.current) {
        try {
          qrScannerRef.current = new Html5Qrcode("qr-reader-exit");
          qrScannerRef.current.start(
            { facingMode: "environment" },
            { 
              fps: 10, 
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1
            },
            (decodedText: string) => {
              handleQrScan(decodedText);
            },
            (errorMessage: string) => {
              // Ignora errori di scanning continui
              if (!errorMessage.includes("NotFoundException")) {
                console.log(errorMessage);
              }
            }
          ).catch((err: any) => {
            setScannerError("Impossibile accedere alla fotocamera. Verifica i permessi.");
            console.error(err);
          });
        } catch (err) {
          setScannerError("Errore nell'avvio della fotocamera");
        }
      }
    }, 500);
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop().then(() => {
        qrScannerRef.current?.clear();
        qrScannerRef.current = null;
        setShowScanner(false);
        setScannerError(null);
      }).catch(() => {});
    } else {
      setShowScanner(false);
    }
  };

  const handleQrScan = (decodedText: string) => {
    try {
      // Prova a parsare come JSON
      const data = JSON.parse(decodedText);
      if (data.ticket) {
        setTicket(data.ticket.toString());
        stopScanner();
      } else if (data.ticket_number) {
        setTicket(data.ticket_number.toString());
        stopScanner();
      }
    } catch (err) {
      // Se non è JSON, prova a estrarre il numero direttamente
      const match = decodedText.match(/\d+/);
      if (match) {
        setTicket(match[0]);
        stopScanner();
      }
    }
  };

  const handleConfirm = () => {
    const n = Number(ticket);
    if (Number.isNaN(n) || n < 1 || n > 999) {
      alert("Numero ticket non valido. Inserire un numero tra 1 e 999");
      return;
    }
    onConfirm(n);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div style={{
        background: MODAL_BG,
        borderRadius: "24px",
        width: "100%",
        maxWidth: "520px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: `1px solid ${BORDER_COLOR}`,
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: DARK_BG,
          padding: "24px 28px",
          borderBottom: `1px solid ${BORDER_COLOR}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              background: BLUE,
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FaTicketAlt size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                color: "#fff", 
                fontSize: "20px", 
                fontWeight: 600 
              }}>
                Uscita veicolo
              </h2>
              <p style={{ 
                margin: "4px 0 0 0", 
                color: "#94a3b8", 
                fontSize: "14px" 
              }}>
                Inserisci il numero del ticket per proseguire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Scanner QR (condizionale) */}
        {showScanner && (
          <div style={{
            padding: "20px",
            borderBottom: `1px solid ${BORDER_COLOR}`,
            background: DARK_BG
          }}>
            <div style={{
              width: "100%",
              aspectRatio: "1",
              maxWidth: "300px",
              margin: "0 auto",
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: `2px solid ${BLUE}`
            }}>
              <div id="qr-reader-exit" ref={scannerContainerRef} style={{ width: "100%", height: "100%" }} />
            </div>
            
            {scannerError && (
              <p style={{ 
                color: "#ef4444", 
                fontSize: "14px", 
                margin: "12px 0 0 0",
                textAlign: "center" 
              }}>
                {scannerError}
              </p>
            )}
            
            <button
              onClick={stopScanner}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "16px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#dc2626"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ef4444"}
            >
              <FaTimes /> Chiudi scanner
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "28px" }}>
          {/* Input numero ticket */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "8px"
            }}>
              Numero ticket
            </label>
            <div style={{ position: "relative" }}>
              <FaTicketAlt style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                fontSize: "18px"
              }} />
              <input
                type="number"
                min="1"
                max="999"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Inserisci numero (1-999)"
                autoFocus
                style={{
                  width: "100%",
                  padding: "16px 16px 16px 48px",
                  background: INPUT_BG,
                  border: `2px solid ${BORDER_COLOR}`,
                  borderRadius: "16px",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 500,
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = BLUE}
                onBlur={(e) => e.currentTarget.style.borderColor = BORDER_COLOR}
              />
            </div>
          </div>

          {/* Pulsanti azione */}
          <div style={{ display: "flex", gap: "12px" }}>
            {!showScanner ? (
              <button
                onClick={startScanner}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: "transparent",
                  border: `2px solid ${BLUE}`,
                  borderRadius: "16px",
                  color: BLUE,
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = BLUE;
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = BLUE;
                }}
              >
                <FaCamera size={18} /> Scannerizza QR
              </button>
            ) : null}
            
            <button
              onClick={handleConfirm}
              style={{
                flex: showScanner ? 1 : 2,
                padding: "16px",
                background: BLUE,
                border: "none",
                borderRadius: "16px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
              onMouseLeave={(e) => e.currentTarget.style.background = BLUE}
            >
              Procedi <FaArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px",
          background: DARK_BG,
          borderTop: `1px solid ${BORDER_COLOR}`,
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <FaQrcode style={{ color: "#64748b", fontSize: "20px" }} />
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>
            Puoi anche scannerizzare il codice QR sul ticket per un inserimento più rapido
          </span>
        </div>
      </div>
    </div>
  );
}
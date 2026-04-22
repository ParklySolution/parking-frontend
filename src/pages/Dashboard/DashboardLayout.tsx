import { useEffect } from "react";
import Dashboard from "./Dashboard";

export default function DashboardLayout() {
  useEffect(() => {
    // Rimuovi qualsiasi stile che limita la larghezza
    const root = document.getElementById('root');
    if (root) {
      root.style.maxWidth = 'none';
      root.style.margin = '0';
      root.style.padding = '0';
      root.style.width = '100vw';
      root.style.height = '100vh';
    }
    
    // Rimuovi eventuali classi di layout
    document.body.classList.add('dashboard-mode');
    
    return () => {
      document.body.classList.remove('dashboard-mode');
    };
  }, []);

  return <Dashboard />;
}
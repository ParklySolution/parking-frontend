import { useEffect, useState } from "react";
import { checkPlateAccess } from "@/services/plateAccessService";
import type { PlateDecision } from "@/types/plate";
import "./PlatesStream.css";

const demoPlates = ["AB123CD", "ZZ999ZZ", "EE777FF"];

export default function PlatesStream() {
  const [events, setEvents] = useState<PlateDecision[]>([]);

  useEffect(() => {
    let index = 0;

    const interval = setInterval(async () => {
      const plate = demoPlates[index % demoPlates.length];

      try {
        const decision = await checkPlateAccess(plate);
        setEvents(prev => [decision, ...prev].slice(0, 6));
      } catch (err) {
        console.error("Errore verifica targa", err);
      }

      index++;
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="plates-stream">
      <h3>📷 Targhe rilevate</h3>

      <ul className="plates-list">
        {events.map((e, i) => (
          <li
            key={i}
            className={`plate-item ${e.status.toLowerCase()} ${i === 0 ? "latest" : ""}`}
          >
            <div className="plate-text">{e.plate}</div>
            <div className="plate-message">{e.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

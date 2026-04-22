import { useEffect, useState } from "react";

export default function GrowthChart({
  data,
  title,
}: {
  data: any[];
  title: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  // Valore massimo per lo scaling
  const max = Math.max(...data.map((d) => d.total), 1);

  // Animazione: i punti crescono gradualmente
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame += 0.02;
      setProgress(Math.min(frame, 1));
      if (frame < 1) requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // Calcolo punti curvi (path SVG)
  const safeLength = Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = (i / safeLength) * 100;
    const y = 100 - ((d.total * progress) / max) * 100;
    return { x, y, value: d.total };
  });

  // Genera path curvo (Cubic Bezier)
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return "";

    let d = `M ${pts[0].x},${pts[0].y}`;

    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }

    return d;
  };

  const path = buildSmoothPath(points);

  return (
    <div className="chart-card">
      <h3>{title}</h3>

      <svg viewBox="0 0 100 100" className="line-chart">

        {/* GRADIENTE PREMIUM */}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f9cff" stopOpacity="1" />
            <stop offset="100%" stopColor="#4f9cff" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* AREA SOTTO LA LINEA */}
        <path
          d={`${path} L 100,100 L 0,100 Z`}
          fill="url(#lineGradient)"
          opacity="0.3"
        />

        {/* LINEA CURVA */}
        <path
          d={path}
          fill="none"
          stroke="#4f9cff"
          strokeWidth="2"
        />

        {/* PUNTI INTERATTIVI */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="#4f9cff"
            stroke="white"
            strokeWidth="0.8"
          />
        ))}
      </svg>
    </div>
  );
}

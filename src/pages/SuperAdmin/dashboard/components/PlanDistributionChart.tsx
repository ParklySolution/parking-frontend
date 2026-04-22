export default function PlanDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <h3>Distribuzione Piani</h3>
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  const total = data.reduce((sum, p) => sum + p.count, 0) || 1;

  let cumulative = 0;

  const slices = data.map((p, i) => {
    const value = p.count / total;
    const start = cumulative;
    const end = cumulative + value;
    cumulative = end;

    const largeArc = value > 0.5 ? 1 : 0;

    const x1 = Math.cos(2 * Math.PI * start) * 50 + 50;
    const y1 = Math.sin(2 * Math.PI * start) * 50 + 50;

    const x2 = Math.cos(2 * Math.PI * end) * 50 + 50;
    const y2 = Math.sin(2 * Math.PI * end) * 50 + 50;

    const color = ["#4f9cff", "#ff7f50", "#ffd700", "#8aff8a"][i % 4];

    return (
      <path
        key={i}
        d={`M50,50 L${x1},${y1} A50,50 0 ${largeArc} 1 ${x2},${y2} Z`}
        fill={color}
      />
    );
  });

  return (
    <div className="chart-card">
      <h3>Distribuzione Piani</h3>
      <svg viewBox="0 0 100 100" className="pie-chart">
        {slices}
      </svg>

      <div className="legend">
        {data.map((p, i) => (
          <div key={i} className="legend-row">
            <span
              className="legend-color"
              style={{
                backgroundColor: ["#4f9cff", "#ff7f50", "#ffd700", "#8aff8a"][
                  i % 4
                ],
              }}
            />
            <span>{p.plan} ({p.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

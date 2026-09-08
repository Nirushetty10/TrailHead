const NODES = [
  { id: 'core', label: 'TRAILHEAD AI', x: 260, y: 220, core: true },
  { id: 'customers', label: 'Customers', x: 70, y: 70 },
  { id: 'products', label: 'Products', x: 260, y: 40 },
  { id: 'orders', label: 'Orders', x: 450, y: 70 },
  { id: 'conversations', label: 'Conversations', x: 60, y: 370 },
  { id: 'revenue', label: 'Revenue', x: 460, y: 370 },
  { id: 'employees', label: 'AI Employees', x: 90, y: 220 },
  { id: 'opportunities', label: 'Opportunities', x: 430, y: 220 },
];

const EDGES = ['customers', 'products', 'orders', 'conversations', 'revenue', 'employees', 'opportunities'];

export default function NetworkGraph() {
  const core = NODES[0];
  return (
    <svg viewBox="0 0 520 440" className="netgraph" role="img" aria-label="Diagram showing TRAILHEAD connected to customers, products, orders, conversations, revenue, AI employees and opportunities">
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4B3CF0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4B3CF0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {EDGES.map((id) => {
        const n = NODES.find((n) => n.id === id);
        return (
          <line
            key={id}
            x1={core.x} y1={core.y} x2={n.x} y2={n.y}
            className="netgraph__line"
          />
        );
      })}

      {EDGES.map((id, i) => {
        const n = NODES.find((n) => n.id === id);
        return (
          <circle key={`p-${id}`} r="3" fill="#4B3CF0" className="netgraph__particle">
            <animateMotion
              dur={`${3 + (i % 3)}s`}
              repeatCount="indefinite"
              path={`M${core.x},${core.y} L${n.x},${n.y}`}
              begin={`${i * 0.4}s`}
            />
          </circle>
        );
      })}

      <circle cx={core.x} cy={core.y} r="70" fill="url(#coreGlow)" />

      {NODES.map((n) =>
        n.core ? (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="34" fill="#171712" />
            <text x={n.x} y={n.y - 2} textAnchor="middle" className="netgraph__core-label">TRAILHEAD</text>
            <text x={n.x} y={n.y + 12} textAnchor="middle" className="netgraph__core-sublabel">AI</text>
          </g>
        ) : (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="5" fill="#4B3CF0" />
            <text
              x={n.x}
              y={n.y + (n.y < core.y ? -14 : 22)}
              textAnchor="middle"
              className="netgraph__label"
            >
              {n.label}
            </text>
          </g>
        )
      )}
    </svg>
  );
}

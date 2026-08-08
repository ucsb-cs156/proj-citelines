const LEVELS = [
  { label: "Level 5", color: "#2bcd9c" },
  { label: "Level 4", color: "#fe9a71" },
  { label: "Level 3", color: "#93ebff" },
  { label: "Level 2", color: "#feaef2" },
  { label: "Level 1", color: "#c99ffe" },
];

export default function LevelLegend() {
  return (
    <div className="concept-graph-legend">
      {LEVELS.map((level, i) => (
        <div key={i} className="concept-graph-legend-row">
          <div
            className="concept-graph-legend-swatch"
            style={{ background: level.color }}
          />
          <span className="concept-graph-legend-label">{level.label}</span>
        </div>
      ))}
    </div>
  );
}

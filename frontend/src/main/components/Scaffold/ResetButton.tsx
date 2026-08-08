export default function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <div className="concept-graph-reset-button" onClick={onReset}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      <span className="concept-graph-reset-button-label">
        Click to reset graph
      </span>
    </div>
  );
}

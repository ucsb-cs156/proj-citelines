export default function StarStatus({
  numStarredConcepts,
  numTotalConcepts,
}: {
  numStarredConcepts: number;
  numTotalConcepts: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginLeft: "auto",
        paddingRight: 0,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          borderTop: "1.5px solid #1E293B",
          borderLeft: "1.5px solid #1E293B",
          borderRight: "4px solid #1E293B",
          borderBottom: "4px solid #1E293B",
          background: "#FACC15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="#1E293B"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: "clamp(11px, 2vw, 16px)",
          fontWeight: 700,
          color: "#1E293B",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}
      >
        {numStarredConcepts} / {numTotalConcepts}
      </span>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import type { Assessment } from "main/types/conceptGraph";

interface AssessmentSelectProps {
  assessments: Assessment[];
  selectedAssessmentId: string;
  onSelect: (id: string) => void;
}

export default function AssessmentSelect({
  assessments,
  selectedAssessmentId,
  onSelect,
}: AssessmentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName =
    assessments.find((a) => a.id === selectedAssessmentId)?.name ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 200 }}>
      <div
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: "100%",
          height: 28,
          padding: "0px 10px",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 13,
          background: "#ffffff",
          color: selectedAssessmentId ? "#1E293B" : "#94A3B8",
          border: "1px solid #000000",
          borderRadius: 6,
          cursor: "pointer",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <span>{selectedName || "Select assessment…"}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && assessments.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 100,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {assessments.map((a, i) => (
            <div
              key={a.id}
              onMouseDown={() => {
                onSelect(a.id);
                setIsOpen(false);
              }}
              className={
                "dropdown-option" +
                (a.id === selectedAssessmentId ? " is-selected" : "")
              }
              style={{
                borderBottom:
                  i < assessments.length - 1 ? "1px solid #F1F5F9" : "none",
              }}
            >
              {a.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import type { Question } from "main/types/conceptGraph";

interface QuestionSearchProps {
  questions: Question[];
  selectedQuestionId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}

export default function QuestionSearch({
  questions,
  selectedQuestionId,
  onSelect,
  disabled,
}: QuestionSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when the questions list is cleared (assessment deselected or changed)
  useEffect(() => {
    if (questions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue("");
      setIsOpen(false);
    }
  }, [questions]);

  // Reset if question is cleared externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedQuestionId) setInputValue("");
  }, [selectedQuestionId]);

  // Close dropdown on outside click
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

  const filtered = questions.filter((q) =>
    q.title.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const handleSelect = (q: Question) => {
    setInputValue(q.title);
    setIsOpen(false);
    onSelect(q.id);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    if (!e.target.value) onSelect("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 28,
    padding: "0px 10px",
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: 13,
    background: disabled ? "#ffffff" : "#ffffff",
    color: "#1E293B",
    border: "1px solid #000000",
    borderRadius: 6,
    outline: "none",
    cursor: disabled ? "not-allowed" : "text",
    boxSizing: "border-box",
  };

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 240 }}>
      {/* Input + clear button wrapper */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0)
              handleSelect(filtered[0]);
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder={
            disabled
              ? "Select assessment to pick question"
              : "Search questions…"
          }
          disabled={disabled}
          style={{ ...inputStyle, paddingRight: inputValue ? 28 : 10 }}
        />
        {inputValue && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue("");
              setIsOpen(false);
              onSelect("");
            }}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94A3B8",
              fontSize: 14,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && !disabled && filtered.length > 0 && (
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
          {filtered.map((q, i) => (
            <div
              key={q.id}
              onMouseDown={() => handleSelect(q)}
              className={
                "dropdown-option" +
                (q.id === selectedQuestionId ? " is-selected" : "")
              }
              style={{
                borderBottom:
                  i < filtered.length - 1 ? "1px solid #F1F5F9" : "none",
              }}
            >
              {q.title}
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && filtered.length === 0 && inputValue && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            color: "#94A3B8",
            zIndex: 100,
          }}
        >
          No questions match "{inputValue}"
        </div>
      )}
    </div>
  );
}

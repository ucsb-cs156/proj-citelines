import { Link } from "react-router";
import { Button, Form } from "react-bootstrap";
import { useStaffTools } from "main/utils/useStaffTools";

const toggleContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
} as const;

export default function Footer() {
  const {
    debugMode,
    enableEditing,
    canUseStaffTools,
    setStaffTool,
    newConceptHandler,
    realignConceptsHandler,
  } = useStaffTools();

  return (
    <footer
      style={{
        background: "#ffffff",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: "1126px",
          maxWidth: "100%",
          margin: "0 auto",
          padding: "16px 20px",
          color: "#475569",
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>
          <Link to="/about">About Scaffold</Link>
        </span>
        {canUseStaffTools && (
          <span style={toggleContainerStyle}>
            {enableEditing && newConceptHandler && (
              <Button
                variant="outline-dark"
                size="sm"
                data-testid="new-concept-button"
                onClick={newConceptHandler}
              >
                New Concept
              </Button>
            )}
            {enableEditing && realignConceptsHandler && (
              <Button
                variant="outline-dark"
                size="sm"
                data-testid="realign-concepts-button"
                onClick={realignConceptsHandler}
              >
                Realign Concepts
              </Button>
            )}
            <Form.Check
              type="switch"
              id="enable-editing-toggle-control"
              className="mb-0"
            >
              <Form.Check.Input
                type="checkbox"
                data-testid="enable-editing-toggle"
                checked={enableEditing}
                onChange={(e) =>
                  setStaffTool("enableEditing", e.target.checked)
                }
              />
              <Form.Check.Label data-testid="enable-editing-toggle-label">
                Enable Editing
              </Form.Check.Label>
            </Form.Check>
            <Form.Check
              type="switch"
              id="debug-mode-toggle-control"
              className="mb-0"
            >
              <Form.Check.Input
                type="checkbox"
                data-testid="debug-mode-toggle"
                checked={debugMode}
                onChange={(e) => setStaffTool("debugMode", e.target.checked)}
              />
              <Form.Check.Label data-testid="debug-mode-toggle-label">
                Debug Mode
              </Form.Check.Label>
            </Form.Check>
          </span>
        )}
      </div>
    </footer>
  );
}

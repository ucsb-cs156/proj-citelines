import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import { Button, Form } from "react-bootstrap";
import { getContrastTextColor, randomHexColor } from "main/utils/colorUtils";

// 8 fully saturated colors
export const SATURATED_COLORS = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#00acc1",
  "#1e88e5",
  "#8e24aa",
  "#d81b60",
];

// 8 pastel (desaturated/lightened) versions of the same hues
export const PASTEL_COLORS = [
  "#ffcdd2",
  "#ffe0b2",
  "#fff9c4",
  "#c8e6c9",
  "#b2ebf2",
  "#bbdefb",
  "#e1bee7",
  "#f8bbd0",
];

export default function ColorChooser({
  value,
  onChange,
  testId = "ColorChooser",
}) {
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [paletteColor, setPaletteColor] = useState(value || "#e53935");

  const selectColor = (color) => {
    onChange(color);
  };

  const handleRandomColor = () => {
    selectColor(randomHexColor());
  };

  const openPaletteModal = () => {
    setPaletteColor(value || "#e53935");
    setShowPaletteModal(true);
  };

  const confirmPaletteColor = () => {
    selectColor(paletteColor);
    setShowPaletteModal(false);
  };

  const renderSwatchRow = (colors, rowTestId) => (
    <div className="d-flex mb-2" data-testid={`${testId}-${rowTestId}`}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => selectColor(color)}
          data-testid={`${testId}-swatch-${color}`}
          aria-label={`Choose color ${color}`}
          aria-pressed={value === color}
          style={{
            backgroundColor: color,
            width: "2rem",
            height: "2rem",
            marginRight: "0.25rem",
            borderRadius: "0.25rem",
            border: value === color ? "2px solid #212529" : "1px solid #ced4da",
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );

  return (
    <div data-testid={`${testId}-container`}>
      {renderSwatchRow(SATURATED_COLORS, "saturated-row")}
      {renderSwatchRow(PASTEL_COLORS, "pastel-row")}
      <div className="d-flex align-items-center">
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          className="me-2"
          onClick={handleRandomColor}
          data-testid={`${testId}-random-button`}
        >
          Random Color
        </Button>
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          onClick={openPaletteModal}
          data-testid={`${testId}-more-colors-button`}
        >
          More Colors...
        </Button>
        {value && (
          <span
            className="ms-2 px-2 py-1 rounded"
            data-testid={`${testId}-current-color`}
            style={{
              backgroundColor: value,
              color: getContrastTextColor(value),
            }}
          >
            {value}
          </span>
        )}
      </div>

      <Modal
        show={showPaletteModal}
        onHide={() => setShowPaletteModal(false)}
        centered
        data-testid={`${testId}-palette-modal`}
      >
        <Modal.Header closeButton>
          <Modal.Title>Choose a Color</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="color"
            value={paletteColor}
            onChange={(e) => setPaletteColor(e.target.value)}
            data-testid={`${testId}-palette-input`}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPaletteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirmPaletteColor}
            data-testid={`${testId}-palette-confirm-button`}
          >
            Choose
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

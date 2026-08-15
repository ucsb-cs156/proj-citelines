import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ColorChooser, {
  SATURATED_COLORS,
  PASTEL_COLORS,
} from "main/components/Common/ColorChooser";

describe("ColorChooser tests", () => {
  test("renders 8 saturated and 8 pastel swatches", () => {
    render(<ColorChooser value="" onChange={vi.fn()} />);

    SATURATED_COLORS.forEach((color) => {
      expect(
        screen.getByTestId(`ColorChooser-swatch-${color}`),
      ).toBeInTheDocument();
    });
    PASTEL_COLORS.forEach((color) => {
      expect(
        screen.getByTestId(`ColorChooser-swatch-${color}`),
      ).toBeInTheDocument();
    });
  });

  test("clicking a swatch calls onChange with that color", () => {
    const onChange = vi.fn();
    render(<ColorChooser value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId(`ColorChooser-swatch-#1e88e5`));

    expect(onChange).toHaveBeenCalledWith("#1e88e5");
  });

  test("clicking Random Color calls onChange with a valid hex color", () => {
    const onChange = vi.fn();
    render(<ColorChooser value="" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("ColorChooser-random-button"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("More Colors... opens a modal, and Choose confirms the selected color", () => {
    const onChange = vi.fn();
    render(<ColorChooser value="#e53935" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("ColorChooser-more-colors-button"));
    expect(screen.getByText("Choose a Color")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("ColorChooser-palette-input"), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByTestId("ColorChooser-palette-confirm-button"));

    expect(onChange).toHaveBeenCalledWith("#123456");
  });

  test("Cancel in the palette modal does not call onChange", () => {
    const onChange = vi.fn();
    render(<ColorChooser value="#e53935" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("ColorChooser-more-colors-button"));
    fireEvent.change(screen.getByTestId("ColorChooser-palette-input"), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByText("Cancel"));

    expect(onChange).not.toHaveBeenCalled();
  });

  test("shows the currently selected color value", () => {
    render(<ColorChooser value="#43a047" onChange={vi.fn()} />);

    expect(screen.getByTestId("ColorChooser-current-color")).toHaveTextContent(
      "#43a047",
    );
  });

  test("respects a custom testId prefix", () => {
    render(<ColorChooser value="" onChange={vi.fn()} testId="CustomChooser" />);

    expect(
      screen.getByTestId("CustomChooser-random-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CustomChooser-more-colors-button"),
    ).toBeInTheDocument();
  });
});

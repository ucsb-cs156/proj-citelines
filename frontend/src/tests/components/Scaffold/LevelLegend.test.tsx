import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LevelLegend from "main/components/Scaffold/LevelLegend";

describe("LevelLegend", () => {
  test("renders a label for each of the five levels", () => {
    render(<LevelLegend />);
    for (const label of [
      "Level 1",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("renders a swatch with the correct color for each level, highest first", () => {
    const { container } = render(<LevelLegend />);
    const swatches = container.querySelectorAll(".concept-graph-legend-swatch");
    const colors = [...swatches].map(
      (el) => (el as HTMLElement).style.background,
    );
    expect(colors).toEqual([
      "rgb(43, 205, 156)",
      "rgb(254, 154, 113)",
      "rgb(147, 235, 255)",
      "rgb(254, 174, 242)",
      "rgb(201, 159, 254)",
    ]);
  });
});

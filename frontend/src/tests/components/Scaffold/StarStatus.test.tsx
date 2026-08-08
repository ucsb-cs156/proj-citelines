import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StarStatus from "main/components/Scaffold/StarStatus";

describe("StarStatus", () => {
  test("shows the starred count out of the total", () => {
    render(<StarStatus numStarredConcepts={5} numTotalConcepts={12} />);
    expect(screen.getByText("5 / 12")).toBeInTheDocument();
  });

  test("shows zero starred concepts", () => {
    render(<StarStatus numStarredConcepts={0} numTotalConcepts={12} />);
    expect(screen.getByText("0 / 12")).toBeInTheDocument();
  });
});

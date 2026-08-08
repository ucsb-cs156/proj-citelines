import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResetButton from "main/components/Scaffold/ResetButton";

describe("ResetButton", () => {
  test("renders the reset label", () => {
    render(<ResetButton onReset={vi.fn()} />);
    expect(screen.getByText("Click to reset graph")).toBeInTheDocument();
  });

  test("calls onReset when clicked", () => {
    const onReset = vi.fn();
    render(<ResetButton onReset={onReset} />);

    fireEvent.click(screen.getByText("Click to reset graph"));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

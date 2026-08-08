import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import EdgeTable from "main/components/Concept/EdgeTable";

describe("EdgeTable tests", () => {
  const testId = "EdgeTable";
  const expectedHeaders = ["id", "sourceLabel", "targetLabel", "Delete"];
  const expectedFields = ["id", "sourceLabel", "targetLabel"];
  const deleteCallback = vi.fn();

  const edgesWithLabels = [
    {
      id: 10,
      sourceId: 1,
      targetId: 2,
      color: null,
      sourceLabel: "Variables",
      targetLabel: "Loops",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders empty table correctly", () => {
    render(<EdgeTable edges={[]} />);

    expectedHeaders.forEach((headerText) => {
      expect(
        screen.getByTestId(`${testId}-header-${headerText}-sort-header`),
      ).toBeInTheDocument();
    });

    expectedFields.forEach((field) => {
      expect(
        screen.queryByTestId(`${testId}-cell-row-0-col-${field}`),
      ).not.toBeInTheDocument();
    });
  });

  test("has expected columns, content, and delete callback", () => {
    render(
      <EdgeTable edges={edgesWithLabels} deleteCallback={deleteCallback} />,
    );

    expectedFields.forEach((field) => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-${field}`),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId(`${testId}-cell-row-0-col-id`)).toHaveTextContent(
      "10",
    );
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-sourceLabel`),
    ).toHaveTextContent("Variables");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-targetLabel`),
    ).toHaveTextContent("Loops");

    expect(screen.getByText("From (source)")).toBeInTheDocument();
    expect(screen.getByText("To (target)")).toBeInTheDocument();

    const deleteButton = screen.getByTestId(
      `${testId}-cell-row-0-col-Delete-button`,
    );
    expect(deleteButton).toHaveClass("btn-danger");

    fireEvent.click(deleteButton);
    expect(deleteCallback).toHaveBeenCalledTimes(1);
  });
});

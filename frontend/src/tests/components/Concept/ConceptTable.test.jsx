import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ConceptTable from "main/components/Concept/ConceptTable";
import conceptsFixtures from "fixtures/conceptsFixtures";

describe("ConceptTable tests", () => {
  const testId = "ConceptTable";
  const expectedHeaders = ["id", "label", "level", "x", "y", "Edit", "Delete"];
  const expectedFields = ["id", "label", "level", "x", "y"];
  const editCallback = vi.fn();
  const deleteCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders empty table correctly", () => {
    render(<ConceptTable concepts={[]} />);

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

  test("has expected columns, content, and button callbacks", () => {
    render(
      <ConceptTable
        concepts={conceptsFixtures.severalConcepts}
        editCallback={editCallback}
        deleteCallback={deleteCallback}
      />,
    );

    expectedHeaders.forEach((headerText) => {
      expect(
        screen.getByTestId(`${testId}-header-${headerText}-sort-header`),
      ).toBeInTheDocument();
    });

    expectedFields.forEach((field) => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-${field}`),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId(`${testId}-cell-row-0-col-id`)).toHaveTextContent(
      "1",
    );
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-label`),
    ).toHaveTextContent("Variables");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-level`),
    ).toHaveTextContent("1");
    expect(screen.getByTestId(`${testId}-cell-row-0-col-x`)).toHaveTextContent(
      "125",
    );
    expect(screen.getByTestId(`${testId}-cell-row-0-col-y`)).toHaveTextContent(
      "250",
    );

    const editButton = screen.getByTestId(
      `${testId}-cell-row-0-col-Edit-button`,
    );
    const deleteButton = screen.getByTestId(
      `${testId}-cell-row-0-col-Delete-button`,
    );

    expect(editButton).toHaveClass("btn-primary");
    expect(deleteButton).toHaveClass("btn-danger");

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(editCallback).toHaveBeenCalledTimes(1);
    expect(deleteCallback).toHaveBeenCalledTimes(1);
  });
});

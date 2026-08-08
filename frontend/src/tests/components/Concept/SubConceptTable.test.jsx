import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import SubConceptTable from "main/components/Concept/SubConceptTable";
import subConceptsFixtures from "fixtures/subConceptsFixtures";

describe("SubConceptTable tests", () => {
  const testId = "SubConceptTable";
  const expectedHeaders = [
    "id",
    "label",
    "parentId",
    "parentLabel",
    "parentLevel",
    "parentX",
    "sortOrder",
    "Edit",
    "Delete",
  ];
  const expectedFields = [
    "id",
    "label",
    "parentId",
    "parentLabel",
    "parentLevel",
    "parentX",
    "sortOrder",
  ];
  const editCallback = vi.fn();
  const deleteCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders empty table correctly", () => {
    render(<SubConceptTable subConcepts={[]} />);

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
      <SubConceptTable
        subConcepts={subConceptsFixtures.severalSubConcepts}
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
      "11",
    );
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-label`),
    ).toHaveTextContent("Declaring variables");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-parentId`),
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-parentLabel`),
    ).toHaveTextContent("Variables");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-parentLevel`),
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-parentX`),
    ).toHaveTextContent("125");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-sortOrder`),
    ).toHaveTextContent("1");

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

  test("renders subconcepts in default parent and sort order", () => {
    const unsortedSubConcepts = [
      {
        id: 22,
        label: "Middle sort order",
        parentId: 1,
        parentLabel: "Variables",
        parentLevel: 1,
        parentX: 125,
        sortOrder: 2,
      },
      {
        id: 33,
        label: "Higher parent level",
        parentId: 2,
        parentLabel: "Loops",
        parentLevel: 2,
        parentX: 300,
        sortOrder: 1,
      },
      {
        id: 11,
        label: "Lower sort order",
        parentId: 1,
        parentLabel: "Variables",
        parentLevel: 1,
        parentX: 125,
        sortOrder: 1,
      },
      {
        id: 44,
        label: "Further left parent",
        parentId: 3,
        parentLabel: "Arrays",
        parentLevel: 1,
        parentX: 50,
        sortOrder: 1,
      },
    ];

    render(<SubConceptTable subConcepts={unsortedSubConcepts} />);

    expect(screen.getByTestId(`${testId}-cell-row-0-col-id`)).toHaveTextContent(
      "44",
    );
    expect(screen.getByTestId(`${testId}-cell-row-1-col-id`)).toHaveTextContent(
      "11",
    );
    expect(screen.getByTestId(`${testId}-cell-row-2-col-id`)).toHaveTextContent(
      "22",
    );
    expect(screen.getByTestId(`${testId}-cell-row-3-col-id`)).toHaveTextContent(
      "33",
    );
  });
});

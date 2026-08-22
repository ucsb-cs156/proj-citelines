import { act, render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import CitationSort from "main/components/Citations/CitationSort";
import { DEFAULT_CITATION_SORT } from "main/utils/citationSort";

// Real pointer-drag physics (element rects, distance thresholds) aren't meaningfully simulatable
// under jsdom, and CitationSort.jsx's own drop-target-resolution logic is already fully covered
// by citationSort.test.jsx's reorderAfterDrag tests (manually verified for real in a browser via
// Storybook). What's still worth covering here is that CitationSort actually wires DndContext's
// onDragEnd up to reorderAfterDrag + onChange — so DndContext is swapped for a stub that renders
// its children normally but hands the onDragEnd callback out to the test, letting a "drag" be
// simulated by just invoking that callback with a {active, over} pair, the same shape dnd-kit
// itself would pass.
let capturedOnDragEnd;
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DndContext: (props) => {
      capturedOnDragEnd = props.onDragEnd;
      return props.children;
    },
  };
});

describe("CitationSort tests", () => {
  test("renders expanded by default, showing 'Citation Sort' and a ▲ toggle icon", () => {
    render(<CitationSort />);

    expect(screen.getByTestId("CitationSort-header")).toHaveTextContent(
      "Citation Sort",
    );
    expect(screen.getByTestId("CitationSort-toggle-icon")).toHaveTextContent(
      "▲",
    );
    expect(screen.getByTestId("CitationSort-body")).toBeInTheDocument();
  });

  test("clicking the header twice collapses then re-expands the panel, updating the label and icon each time", () => {
    render(<CitationSort />);

    fireEvent.click(screen.getByTestId("CitationSort-header"));

    expect(screen.getByTestId("CitationSort-header")).toHaveTextContent(
      "citation sort",
    );
    expect(screen.getByTestId("CitationSort-toggle-icon")).toHaveTextContent(
      "▼",
    );

    fireEvent.click(screen.getByTestId("CitationSort-header"));

    expect(screen.getByTestId("CitationSort-header")).toHaveTextContent(
      "Citation Sort",
    );
    expect(screen.getByTestId("CitationSort-toggle-icon")).toHaveTextContent(
      "▲",
    );
  });

  test("defaults sortCriteria to empty: shows all four options available and a 'No sort applied' placeholder", () => {
    render(<CitationSort />);

    expect(
      screen.getByTestId("CitationSort-selected-list-empty"),
    ).toHaveTextContent("No sort applied");
    ["Relevance", "Year", "Author", "Title"].forEach((option) => {
      expect(
        screen.getByTestId(`CitationSort-available-item-${option}`),
      ).toHaveTextContent(option);
    });
    expect(
      screen.queryByTestId("CitationSort-available-list-empty"),
    ).not.toBeInTheDocument();
  });

  test("shows selected criteria numbered in order, and only the remaining options as available", () => {
    render(
      <CitationSort
        sortCriteria={[
          { field: "Author", direction: "asc" },
          { field: "Title", direction: "desc" },
        ]}
      />,
    );

    expect(
      screen.getByTestId("CitationSort-selected-list"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CitationSort-available-list"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("CitationSort-selected-item-Author"),
    ).toHaveTextContent("1. Author");
    expect(
      screen.getByTestId("CitationSort-selected-item-Title"),
    ).toHaveTextContent("2. Title");
    expect(
      screen.queryByTestId("CitationSort-selected-list-empty"),
    ).not.toBeInTheDocument();

    ["Relevance", "Year"].forEach((option) => {
      expect(
        screen.getByTestId(`CitationSort-available-item-${option}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`CitationSort-available-item-${option}-handle`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`CitationSort-available-item-${option}-add`),
      ).toHaveAttribute("aria-label", `Add ${option}`);
    });
    expect(
      screen.queryByTestId("CitationSort-available-item-Author"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("CitationSort-available-item-Title"),
    ).not.toBeInTheDocument();
  });

  test("shows an 'All criteria selected' placeholder when every option has been selected", () => {
    render(
      <CitationSort
        sortCriteria={[
          { field: "Relevance", direction: "desc" },
          { field: "Year", direction: "asc" },
          { field: "Author", direction: "asc" },
          { field: "Title", direction: "asc" },
        ]}
      />,
    );

    expect(
      screen.getByTestId("CitationSort-available-list-empty"),
    ).toHaveTextContent("All criteria selected");
  });

  test("clicking 'Add >' on an available item adds it at its default direction via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[{ field: "Author", direction: "asc" }]}
        onChange={onChange}
        testId="CitationSort"
      />,
    );

    fireEvent.click(
      screen.getByTestId("CitationSort-available-item-Title-add"),
    );

    expect(onChange).toHaveBeenCalledWith([
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ]);
  });

  test("clicking the remove (×) button on a selected item removes it via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[
          { field: "Author", direction: "asc" },
          { field: "Title", direction: "asc" },
        ]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByTestId("CitationSort-selected-item-Author-remove"),
    ).toHaveAttribute("aria-label", "Remove Author");

    fireEvent.click(
      screen.getByTestId("CitationSort-selected-item-Author-remove"),
    );

    expect(onChange).toHaveBeenCalledWith([
      { field: "Title", direction: "asc" },
    ]);
  });

  test("an ascending chip shows ↑ and toggles to descending via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[{ field: "Author", direction: "asc" }]}
        onChange={onChange}
      />,
    );

    const button = screen.getByTestId(
      "CitationSort-selected-item-Author-direction",
    );
    expect(button).toHaveTextContent("↑");
    expect(button).toHaveAttribute(
      "aria-label",
      "Author sorts ascending — click to sort descending instead",
    );

    fireEvent.click(button);

    expect(onChange).toHaveBeenCalledWith([
      { field: "Author", direction: "desc" },
    ]);
  });

  test("a descending chip shows ↓ and toggles to ascending via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[{ field: "Author", direction: "desc" }]}
        onChange={onChange}
      />,
    );

    const button = screen.getByTestId(
      "CitationSort-selected-item-Author-direction",
    );
    expect(button).toHaveTextContent("↓");
    expect(button).toHaveAttribute(
      "aria-label",
      "Author sorts descending — click to sort ascending instead",
    );

    fireEvent.click(button);

    expect(onChange).toHaveBeenCalledWith([
      { field: "Author", direction: "asc" },
    ]);
  });

  test("toggling direction only affects the clicked chip, leaving others and their order untouched", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[
          { field: "Author", direction: "asc" },
          { field: "Title", direction: "desc" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByTestId("CitationSort-selected-item-Title-direction"),
    );

    expect(onChange).toHaveBeenCalledWith([
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ]);
  });

  test("dragging an available item onto the selected container adds it at its default direction via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[{ field: "Author", direction: "asc" }]}
        onChange={onChange}
      />,
    );

    act(() => {
      capturedOnDragEnd({
        active: { id: "Title" },
        over: { id: "CitationSort-selected-container" },
      });
    });

    expect(onChange).toHaveBeenCalledWith([
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ]);
  });

  test("dragging a selected item onto the available container removes it via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[
          { field: "Author", direction: "asc" },
          { field: "Title", direction: "desc" },
        ]}
        onChange={onChange}
      />,
    );

    act(() => {
      capturedOnDragEnd({
        active: { id: "Author" },
        over: { id: "CitationSort-available-container" },
      });
    });

    expect(onChange).toHaveBeenCalledWith([
      { field: "Title", direction: "desc" },
    ]);
  });

  test("dragging with no drop target does not call onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={[{ field: "Author", direction: "asc" }]}
        onChange={onChange}
      />,
    );

    act(() => {
      capturedOnDragEnd({ active: { id: "Author" }, over: null });
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("the header and each drag handle show a grab/pointer cursor", () => {
    render(
      <CitationSort sortCriteria={[{ field: "Author", direction: "asc" }]} />,
    );

    expect(screen.getByTestId("CitationSort-header")).toHaveStyle({
      cursor: "pointer",
    });
    expect(
      screen.getByTestId("CitationSort-selected-item-Author-handle"),
    ).toHaveStyle({ cursor: "grab" });
    expect(
      screen.getByTestId("CitationSort-available-item-Relevance-handle"),
    ).toHaveStyle({ cursor: "grab" });
  });

  test("supports a custom testId", () => {
    render(<CitationSort testId="MySort" />);

    expect(screen.getByTestId("MySort")).toBeInTheDocument();
    expect(screen.getByTestId("MySort-header")).toBeInTheDocument();
    expect(
      screen.getByTestId("MySort-available-item-Relevance"),
    ).toBeInTheDocument();
  });

  test("defaults sortCriteria to DEFAULT_CITATION_SORT when not provided", () => {
    render(<CitationSort />);

    expect(DEFAULT_CITATION_SORT).toEqual([]);
    expect(
      screen.getByTestId("CitationSort-selected-list-empty"),
    ).toBeInTheDocument();
  });
});

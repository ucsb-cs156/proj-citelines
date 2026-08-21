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
    render(<CitationSort sortCriteria={["Author", "Title"]} />);

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
      <CitationSort sortCriteria={["Relevance", "Year", "Author", "Title"]} />,
    );

    expect(
      screen.getByTestId("CitationSort-available-list-empty"),
    ).toHaveTextContent("All criteria selected");
  });

  test("clicking 'Add >' on an available item adds it to the end of sortCriteria via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={["Author"]}
        onChange={onChange}
        testId="CitationSort"
      />,
    );

    fireEvent.click(
      screen.getByTestId("CitationSort-available-item-Title-add"),
    );

    expect(onChange).toHaveBeenCalledWith(["Author", "Title"]);
  });

  test("clicking the remove (×) button on a selected item removes it via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort sortCriteria={["Author", "Title"]} onChange={onChange} />,
    );

    fireEvent.click(
      screen.getByTestId("CitationSort-selected-item-Author-remove"),
    );

    expect(onChange).toHaveBeenCalledWith(["Title"]);
  });

  test("the ↑ button is disabled for the first item and moves any other item up via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={["Author", "Title", "Year"]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByTestId("CitationSort-selected-item-Author-up"),
    ).toBeDisabled();

    fireEvent.click(screen.getByTestId("CitationSort-selected-item-Title-up"));

    expect(onChange).toHaveBeenCalledWith(["Title", "Author", "Year"]);
  });

  test("the ↓ button is disabled for the last item and moves any other item down via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort
        sortCriteria={["Author", "Title", "Year"]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByTestId("CitationSort-selected-item-Year-down"),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByTestId("CitationSort-selected-item-Title-down"),
    );

    expect(onChange).toHaveBeenCalledWith(["Author", "Year", "Title"]);
  });

  test("dragging an available item onto the selected container adds it via onChange", () => {
    const onChange = vi.fn();
    render(<CitationSort sortCriteria={["Author"]} onChange={onChange} />);

    act(() => {
      capturedOnDragEnd({
        active: { id: "Title" },
        over: { id: "CitationSort-selected-container" },
      });
    });

    expect(onChange).toHaveBeenCalledWith(["Author", "Title"]);
  });

  test("dragging a selected item onto the available container removes it via onChange", () => {
    const onChange = vi.fn();
    render(
      <CitationSort sortCriteria={["Author", "Title"]} onChange={onChange} />,
    );

    act(() => {
      capturedOnDragEnd({
        active: { id: "Author" },
        over: { id: "CitationSort-available-container" },
      });
    });

    expect(onChange).toHaveBeenCalledWith(["Title"]);
  });

  test("dragging with no drop target does not call onChange", () => {
    const onChange = vi.fn();
    render(<CitationSort sortCriteria={["Author"]} onChange={onChange} />);

    act(() => {
      capturedOnDragEnd({ active: { id: "Author" }, over: null });
    });

    expect(onChange).not.toHaveBeenCalled();
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

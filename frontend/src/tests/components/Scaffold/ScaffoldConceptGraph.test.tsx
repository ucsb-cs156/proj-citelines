import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScaffoldConceptGraph from "main/components/Scaffold/ScaffoldConceptGraph";
import { StaffToolsContext } from "main/utils/staffToolsContext";
import type { ReactElement } from "react";

// @xyflow/react measures its container via ResizeObserver and
// getBoundingClientRect, neither of which jsdom implements with real
// dimensions. Stub both so the graph can mount and compute a viewport.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  Element.prototype.getBoundingClientRect = () =>
    ({
      width: 1000,
      height: 1000,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
});

const sampleMajorConcepts = [
  {
    id: 1,
    labelHtml: "Recursion",
    color: "#fe9a71",
    subconcepts: [
      { id: 2, parentId: 1, labelHtml: "Base case" },
      { id: 3, parentId: 1, labelHtml: "State change" },
    ],
  },
  {
    id: 4,
    labelHtml: "Loops",
    color: "#93ebff",
    subconcepts: [{ id: 5, parentId: 4, labelHtml: "For loops" }],
  },
];
const samplePositions = {
  "1": { x: 100, y: 100 },
  "4": { x: 300, y: 100 },
};
const samplePrereqEdgeData = [
  { id: 20, sourceId: 4, targetId: 1, color: null },
];

function baseProps() {
  return {
    majorConcepts: sampleMajorConcepts,
    positions: samplePositions,
    conceptContent: {},
    prereqEdgeData: samplePrereqEdgeData,
    highlightedIds: new Set<string>(),
    highlightedSubconcepts: new Map<string, Set<string>>(),
    onConceptClick: vi.fn(),
    starredIds: new Set<string>(),
    onStarClick: vi.fn(),
    onReset: vi.fn(),
    masteredSubconcepts: new Set<string>(),
    onSubconceptMastered: vi.fn(),
  };
}

describe("ScaffoldConceptGraph", () => {
  test("renders the major concept nodes from the supplied data", () => {
    render(<ScaffoldConceptGraph {...baseProps()} />);
    expect(screen.getByText("Recursion")).toBeInTheDocument();
    expect(screen.getByText("Loops")).toBeInTheDocument();
  });

  test("clicking a concept node calls onConceptClick with its id", () => {
    const props = baseProps();
    render(<ScaffoldConceptGraph {...props} />);

    fireEvent.click(screen.getByText("Recursion"));

    expect(props.onConceptClick).toHaveBeenCalledWith("1");
  });

  test("clicking the reset control calls onReset", () => {
    const props = baseProps();
    render(<ScaffoldConceptGraph {...props} />);

    fireEvent.click(screen.getByText("Click to reset graph"));

    expect(props.onReset).toHaveBeenCalled();
  });

  test("clicking the pane calls onPaneClick", () => {
    const props = baseProps();
    const onPaneClick = vi.fn();
    const { container } = render(
      <ScaffoldConceptGraph {...props} onPaneClick={onPaneClick} />,
    );

    const pane = container.querySelector(".react-flow__pane");
    expect(pane).not.toBeNull();
    fireEvent.click(pane as Element);

    expect(onPaneClick).toHaveBeenCalled();
  });

  test("renders restored detail cards", () => {
    const props = baseProps();
    render(
      <ScaffoldConceptGraph
        {...props}
        restoredDetailCards={[
          {
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "1",
            conceptColor: "#fe9a71",
            posX: 100,
            posY: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText("Description")).toBeInTheDocument();
    // The concept name appears twice: once for the graph node, once for the detail card.
    expect(screen.getAllByText("Recursion").length).toBeGreaterThanOrEqual(2);
  });

  test("clicking a node's star button calls onStarClick with its id, not onConceptClick", () => {
    const props = baseProps();
    render(<ScaffoldConceptGraph {...props} />);

    fireEvent.click(screen.getByTestId("star-button-1"));

    expect(props.onStarClick).toHaveBeenCalledWith("1");
    expect(props.onConceptClick).not.toHaveBeenCalled();
  });

  test("clicking a subconcept checkbox calls onSubconceptMastered with its label", () => {
    const props = baseProps();
    render(<ScaffoldConceptGraph {...props} />);

    // The "Recursion" node (id 1) has "Base case" as its first subconcept.
    fireEvent.click(screen.getByTestId("subconcept-checkbox-1-0"));

    expect(props.onSubconceptMastered).toHaveBeenCalledWith("Base case");
  });

  test("dropping a dragged card onto the canvas calls onDetailAdded and renders the new card", async () => {
    const props = baseProps();
    const onDetailAdded = vi.fn();
    const { container } = render(
      <ScaffoldConceptGraph {...props} onDetailAdded={onDetailAdded} />,
    );

    // ReactFlow's onInit (which populates the instance used for
    // screenToFlowPosition) fires via a setTimeout, so the instance isn't
    // ready synchronously after render.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const flowWrapper = container.querySelector(".react-flow") as Element;
    const payload = {
      cardType: "Example",
      itemLabel: "Recursion",
      conceptId: "1",
      conceptColor: "#fe9a71",
      cardContent: "def factorial(n): ...",
    };
    fireEvent.drop(flowWrapper, {
      clientX: 400,
      clientY: 300,
      dataTransfer: {
        getData: () => JSON.stringify(payload),
      },
    });

    expect(onDetailAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        cardType: "Example",
        itemLabel: "Recursion",
        conceptId: "1",
        conceptColor: "#fe9a71",
      }),
    );
    expect(screen.getByText("Example")).toBeInTheDocument();
  });

  test("deleting a detail card calls onDetailDeleted and removes the card", () => {
    const props = baseProps();
    const onDetailDeleted = vi.fn();
    render(
      <ScaffoldConceptGraph
        {...props}
        onDetailDeleted={onDetailDeleted}
        restoredDetailCards={[
          {
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "1",
            conceptColor: "#fe9a71",
            posX: 100,
            posY: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText("Description")).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId(
        "detail-delete-detail-restored-0-Description-Recursion",
      ),
    );

    expect(onDetailDeleted).toHaveBeenCalledWith("Description", "Recursion");
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  test("greys out non-highlighted concepts and highlights selected ones, and highlights matching subconcepts", () => {
    const props = baseProps();
    render(
      <ScaffoldConceptGraph
        {...props}
        highlightedIds={new Set(["1"])}
        highlightedSubconcepts={new Map([["1", new Set(["Base case"])]])}
      />,
    );

    const recursionCard = screen.getByTestId("major-node-1");
    const loopsCard = screen.getByTestId("major-node-4");

    expect(recursionCard.style.opacity).toBe("1");
    expect(loopsCard.style.opacity).toBe("0.25");

    const highlightedSubconcept = screen.getByTestId("subconcept-row-1-0");
    expect(highlightedSubconcept.style.background).not.toBe("");
  });

  test("greys out a detail card when its concept is not in the highlighted set", () => {
    const props = baseProps();
    const { container } = render(
      <ScaffoldConceptGraph
        {...props}
        highlightedIds={new Set(["4"])}
        restoredDetailCards={[
          {
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "1",
            conceptColor: "#fe9a71",
            posX: 100,
            posY: 100,
          },
        ]}
      />,
    );

    const detailCard = container.querySelector(
      '[data-id^="detail-restored-"] > div',
    ) as HTMLElement;
    expect(detailCard.style.background).toBe("rgb(241, 245, 249)");
  });

  test("keeps a detail card at full color when its concept is highlighted", () => {
    const props = baseProps();
    const { container } = render(
      <ScaffoldConceptGraph
        {...props}
        highlightedIds={new Set(["1"])}
        restoredDetailCards={[
          {
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "1",
            conceptColor: "#fe9a71",
            posX: 100,
            posY: 100,
          },
        ]}
      />,
    );

    const detailCard = container.querySelector(
      '[data-id^="detail-restored-"] > div',
    ) as HTMLElement;
    expect(detailCard.style.background).not.toBe("rgb(241, 245, 249)");
  });

  test("dragging over the canvas allows a drop", () => {
    const props = baseProps();
    const { container } = render(<ScaffoldConceptGraph {...props} />);
    const flowWrapper = container.querySelector(".react-flow") as Element;

    const event = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { dropEffect: "" },
    });
    flowWrapper.dispatchEvent(event);

    expect((event as DragEvent).dataTransfer!.dropEffect).toBe("move");
    expect(event.defaultPrevented).toBe(true);
  });

  test("dropping with no card payload does not add a detail card", () => {
    const props = baseProps();
    const onDetailAdded = vi.fn();
    const { container } = render(
      <ScaffoldConceptGraph {...props} onDetailAdded={onDetailAdded} />,
    );
    const flowWrapper = container.querySelector(".react-flow") as Element;

    fireEvent.drop(flowWrapper, {
      clientX: 400,
      clientY: 300,
      dataTransfer: { getData: () => "" },
    });

    expect(onDetailAdded).not.toHaveBeenCalled();
  });

  test("dropping before the flow instance is ready does not add a detail card", () => {
    const props = baseProps();
    const onDetailAdded = vi.fn();
    const { container } = render(
      <ScaffoldConceptGraph {...props} onDetailAdded={onDetailAdded} />,
    );
    const flowWrapper = container.querySelector(".react-flow") as Element;
    const payload = {
      cardType: "Example",
      itemLabel: "Recursion",
      conceptId: "1",
      conceptColor: "#fe9a71",
      cardContent: "def factorial(n): ...",
    };

    // No await here: dropping immediately after render, before ReactFlow's
    // onInit (fired via setTimeout) has populated the flow instance.
    fireEvent.drop(flowWrapper, {
      clientX: 400,
      clientY: 300,
      dataTransfer: { getData: () => JSON.stringify(payload) },
    });

    expect(onDetailAdded).not.toHaveBeenCalled();
  });

  test("clicking a detail card does not call onConceptClick", () => {
    const props = baseProps();
    render(
      <ScaffoldConceptGraph
        {...props}
        restoredDetailCards={[
          {
            cardType: "Description",
            itemLabel: "Unique Detail Label",
            conceptId: "1",
            conceptColor: "#fe9a71",
            posX: 100,
            posY: 100,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Unique Detail Label"));

    expect(props.onConceptClick).not.toHaveBeenCalled();
  });
});

describe("ScaffoldConceptGraph re-syncs when majorConcepts changes", () => {
  // Regression test: after creating/editing a concept or subconcept, the
  // page's majorConcepts refetch used to have no effect on the already
  // mounted graph until a full page refresh, because useNodesState only
  // consumes its initial value once.
  test("shows a newly-added top-level concept without remounting", () => {
    const props = baseProps();
    const { rerender } = render(<ScaffoldConceptGraph {...props} />);

    expect(screen.queryByText("Recursion")).toBeInTheDocument();
    expect(screen.queryByText("Iteration")).not.toBeInTheDocument();

    const updatedMajorConcepts = [
      ...sampleMajorConcepts,
      {
        id: 6,
        labelHtml: "Iteration",
        color: "#c0ffee",
        subconcepts: [],
      },
    ];
    rerender(
      <ScaffoldConceptGraph {...props} majorConcepts={updatedMajorConcepts} />,
    );

    expect(screen.getByText("Iteration")).toBeInTheDocument();
  });

  test("shows a newly-added subconcept on an existing concept without remounting", () => {
    const props = baseProps();
    const { rerender } = render(<ScaffoldConceptGraph {...props} />);

    expect(screen.queryByText("Recursive case")).not.toBeInTheDocument();

    const updatedMajorConcepts = sampleMajorConcepts.map((concept) =>
      concept.id === 1
        ? {
            ...concept,
            subconcepts: [
              ...concept.subconcepts,
              { id: 7, parentId: 1, labelHtml: "Recursive case" },
            ],
          }
        : concept,
    );
    rerender(
      <ScaffoldConceptGraph {...props} majorConcepts={updatedMajorConcepts} />,
    );

    expect(screen.getByText("Recursive case")).toBeInTheDocument();
  });

  test("shows an edited concept's label without remounting", () => {
    const props = baseProps();
    const { rerender } = render(<ScaffoldConceptGraph {...props} />);

    expect(screen.queryByText("Recursion")).toBeInTheDocument();

    const updatedMajorConcepts = sampleMajorConcepts.map((concept) =>
      concept.id === 1
        ? { ...concept, labelHtml: "Recursion (renamed)" }
        : concept,
    );
    rerender(
      <ScaffoldConceptGraph {...props} majorConcepts={updatedMajorConcepts} />,
    );

    expect(screen.queryByText("Recursion")).not.toBeInTheDocument();
    expect(screen.getByText("Recursion (renamed)")).toBeInTheDocument();
  });

  test("keeps a dragged concept's position when majorConcepts is refreshed", () => {
    const props = baseProps();
    const { rerender, container } = render(<ScaffoldConceptGraph {...props} />);

    const nodeBefore = container.querySelector('[data-id="1"]') as HTMLElement;
    const transformBefore = nodeBefore.style.transform;

    const updatedMajorConcepts = sampleMajorConcepts.map((concept) =>
      concept.id === 1
        ? { ...concept, labelHtml: "Recursion updated" }
        : concept,
    );
    rerender(
      <ScaffoldConceptGraph {...props} majorConcepts={updatedMajorConcepts} />,
    );

    const nodeAfter = container.querySelector('[data-id="1"]') as HTMLElement;
    expect(nodeAfter.style.transform).toBe(transformBefore);
    expect(screen.getByText("Recursion updated")).toBeInTheDocument();
  });
});

describe("ScaffoldConceptGraph debug mode tooltips", () => {
  function renderWithDebugMode(ui: ReactElement, debugMode: boolean) {
    return render(
      <StaffToolsContext.Provider
        value={{
          debugMode,
          enableEditing: false,
          setStaffTool: vi.fn(),
          canUseStaffTools: true,
          newConceptHandler: null,
          registerNewConceptHandler: vi.fn(),
          realignConceptsHandler: null,
          registerRealignConceptsHandler: vi.fn(),
        }}
      >
        {ui}
      </StaffToolsContext.Provider>,
    );
  }

  test("nodes have no title tooltip when debug mode is off", () => {
    renderWithDebugMode(<ScaffoldConceptGraph {...baseProps()} />, false);
    expect(screen.getByTestId("major-node-1")).not.toHaveAttribute("title");
  });

  test("nodes show the full concept JSON as a tooltip when debug mode is on", () => {
    const props = baseProps();
    props.conceptContent = {
      "1": {
        id: 1,
        parentId: null,
        descriptionHtml: "<p>desc</p>",
        exampleHtml: null,
        practiceUrl: null,
      },
    };
    renderWithDebugMode(<ScaffoldConceptGraph {...props} />, true);

    const title = screen.getByTestId("major-node-1").getAttribute("title");
    expect(title).not.toBeNull();
    expect(JSON.parse(title!)).toEqual({
      id: "1",
      label: "Recursion",
      color: "#fe9a71",
      subconcepts: [
        { id: 2, parentId: 1, labelHtml: "Base case" },
        { id: 3, parentId: 1, labelHtml: "State change" },
      ],
      conceptContent: {
        id: 1,
        parentId: null,
        descriptionHtml: "<p>desc</p>",
        exampleHtml: null,
        practiceUrl: null,
      },
    });
    // Pretty-printed (multi-line), not a single-line blob.
    expect(title).toContain("\n");
  });
});

describe("ScaffoldConceptGraph subconcept drag-and-drop reordering", () => {
  function renderWithEditing(ui: ReactElement, enableEditing: boolean) {
    return render(
      <StaffToolsContext.Provider
        value={{
          debugMode: false,
          enableEditing,
          setStaffTool: vi.fn(),
          canUseStaffTools: true,
          newConceptHandler: null,
          registerNewConceptHandler: vi.fn(),
          realignConceptsHandler: null,
          registerRealignConceptsHandler: vi.fn(),
        }}
      >
        {ui}
      </StaffToolsContext.Provider>,
    );
  }

  const dataTransfer = {
    effectAllowed: "",
    setData: vi.fn(),
    getData: vi.fn(),
  };

  test("rows are not draggable and show no drag handle when locked", () => {
    render(<ScaffoldConceptGraph {...baseProps()} />);
    const row = screen.getByTestId("subconcept-row-1-0");
    expect(row).not.toHaveAttribute("draggable", "true");
    expect(
      screen.queryByTestId("subconcept-drag-handle-1-0"),
    ).not.toBeInTheDocument();
  });

  test("rows are draggable and show a drag handle when editing is enabled", () => {
    renderWithEditing(<ScaffoldConceptGraph {...baseProps()} />, true);
    const row = screen.getByTestId("subconcept-row-1-0");
    expect(row).toHaveAttribute("draggable", "true");
    expect(screen.getByTestId("add-subconcept-button-1")).toBeInTheDocument();
    expect(
      screen.getByTestId("subconcept-drag-handle-1-0"),
    ).toBeInTheDocument();
  });

  test("double-clicking a concept header invokes the edit callback only when editing is enabled", () => {
    const onConceptDoubleClick = vi.fn();
    renderWithEditing(
      <ScaffoldConceptGraph
        {...baseProps()}
        onConceptDoubleClick={onConceptDoubleClick}
      />,
      true,
    );

    fireEvent.doubleClick(screen.getByTestId("major-node-header-1"));

    expect(onConceptDoubleClick).toHaveBeenCalledWith("1");
  });

  test("double-clicking a subconcept row invokes the edit callback only when editing is enabled", () => {
    const onSubconceptDoubleClick = vi.fn();
    renderWithEditing(
      <ScaffoldConceptGraph
        {...baseProps()}
        onSubconceptDoubleClick={onSubconceptDoubleClick}
      />,
      true,
    );

    fireEvent.doubleClick(screen.getByTestId("subconcept-row-1-0"));

    expect(onSubconceptDoubleClick).toHaveBeenCalledWith("1", "2");
  });

  test("clicking add subconcept invokes the callback only when editing is enabled", () => {
    const onAddSubconcept = vi.fn();
    renderWithEditing(
      <ScaffoldConceptGraph
        {...baseProps()}
        onAddSubconcept={onAddSubconcept}
      />,
      true,
    );

    fireEvent.click(screen.getByTestId("add-subconcept-button-1"));

    expect(onAddSubconcept).toHaveBeenCalledWith("1");
  });

  test("dropping a row on another reorders the card and reports the new id order", () => {
    const props = { ...baseProps(), onSubconceptsReordered: vi.fn() };
    renderWithEditing(<ScaffoldConceptGraph {...props} />, true);

    // "Recursion" (node 1) starts as [Base case (2), State change (3)];
    // drag row 0 onto row 1.
    fireEvent.dragStart(screen.getByTestId("subconcept-row-1-0"), {
      dataTransfer,
    });
    fireEvent.dragOver(screen.getByTestId("subconcept-row-1-1"), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByTestId("subconcept-row-1-1"), { dataTransfer });

    expect(props.onSubconceptsReordered).toHaveBeenCalledWith(1, [3, 2]);
    // The card re-renders in the new order.
    expect(screen.getByTestId("subconcept-row-1-0")).toHaveTextContent(
      "State change",
    );
    expect(screen.getByTestId("subconcept-row-1-1")).toHaveTextContent(
      "Base case",
    );
  });

  test("dropping a row back on itself changes nothing and reports nothing", () => {
    const props = { ...baseProps(), onSubconceptsReordered: vi.fn() };
    renderWithEditing(<ScaffoldConceptGraph {...props} />, true);

    fireEvent.dragStart(screen.getByTestId("subconcept-row-1-0"), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByTestId("subconcept-row-1-0"), { dataTransfer });

    expect(props.onSubconceptsReordered).not.toHaveBeenCalled();
    expect(screen.getByTestId("subconcept-row-1-0")).toHaveTextContent(
      "Base case",
    );
  });

  test("dropping something that is not a row drag (no dragStart) is ignored", () => {
    const props = { ...baseProps(), onSubconceptsReordered: vi.fn() };
    renderWithEditing(<ScaffoldConceptGraph {...props} />, true);

    // e.g. a detail-card drag entering a row: dragIndex is null, so the row
    // must not intercept it.
    fireEvent.dragOver(screen.getByTestId("subconcept-row-1-1"), {
      dataTransfer,
    });
    fireEvent.drop(screen.getByTestId("subconcept-row-1-1"), { dataTransfer });

    expect(props.onSubconceptsReordered).not.toHaveBeenCalled();
  });

  test("dragEnd clears the in-progress drag state", () => {
    const props = { ...baseProps(), onSubconceptsReordered: vi.fn() };
    renderWithEditing(<ScaffoldConceptGraph {...props} />, true);

    const row0 = screen.getByTestId("subconcept-row-1-0");
    fireEvent.dragStart(row0, { dataTransfer });
    fireEvent.dragEnd(row0, { dataTransfer });
    // The abandoned drag leaves no pending dragIndex, so a later drop does nothing.
    fireEvent.drop(screen.getByTestId("subconcept-row-1-1"), { dataTransfer });

    expect(props.onSubconceptsReordered).not.toHaveBeenCalled();
  });
});

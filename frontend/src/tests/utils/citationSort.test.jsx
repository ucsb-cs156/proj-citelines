import {
  CITATION_SORT_OPTIONS,
  DEFAULT_CITATION_SORT,
  SELECTED_CONTAINER_ID,
  AVAILABLE_CONTAINER_ID,
  addCriterion,
  removeCriterion,
  moveCriterion,
  reorderAfterDrag,
} from "main/utils/citationSort";

describe("citationSort constants", () => {
  test("CITATION_SORT_OPTIONS lists the four sortable fields", () => {
    expect(CITATION_SORT_OPTIONS).toEqual([
      "Relevance",
      "Year",
      "Author",
      "Title",
    ]);
  });

  test("DEFAULT_CITATION_SORT starts empty (no sort applied)", () => {
    expect(DEFAULT_CITATION_SORT).toEqual([]);
  });
});

describe("addCriterion", () => {
  test("appends a criterion that isn't already selected", () => {
    expect(addCriterion(["Author"], "Title")).toEqual(["Author", "Title"]);
  });

  test("is a no-op if the criterion is already selected", () => {
    const sortCriteria = ["Author", "Title"];
    expect(addCriterion(sortCriteria, "Author")).toBe(sortCriteria);
  });
});

describe("removeCriterion", () => {
  test("removes a selected criterion", () => {
    expect(removeCriterion(["Author", "Title"], "Author")).toEqual(["Title"]);
  });

  test("is a no-op if the criterion isn't selected", () => {
    expect(removeCriterion(["Author"], "Title")).toEqual(["Author"]);
  });
});

describe("moveCriterion", () => {
  test("moving up (-1) swaps with the previous element", () => {
    expect(moveCriterion(["Author", "Title", "Year"], "Title", -1)).toEqual([
      "Title",
      "Author",
      "Year",
    ]);
  });

  test("moving down (+1) swaps with the next element", () => {
    expect(moveCriterion(["Author", "Title", "Year"], "Title", 1)).toEqual([
      "Author",
      "Year",
      "Title",
    ]);
  });

  test("moving the first element up is a no-op", () => {
    const sortCriteria = ["Author", "Title"];
    expect(moveCriterion(sortCriteria, "Author", -1)).toBe(sortCriteria);
  });

  test("moving the last element down is a no-op", () => {
    const sortCriteria = ["Author", "Title"];
    expect(moveCriterion(sortCriteria, "Title", 1)).toBe(sortCriteria);
  });

  test("is a no-op if the criterion isn't selected", () => {
    const sortCriteria = ["Author"];
    expect(moveCriterion(sortCriteria, "Title", 1)).toBe(sortCriteria);
  });
});

describe("reorderAfterDrag", () => {
  test("returns the same array when there's no drop target", () => {
    const sortCriteria = ["Author"];
    expect(reorderAfterDrag(sortCriteria, "Title", null)).toBe(sortCriteria);
    expect(reorderAfterDrag(sortCriteria, "Title", undefined)).toBe(
      sortCriteria,
    );
  });

  test("returns the same array when dropped on itself", () => {
    const sortCriteria = ["Author"];
    expect(reorderAfterDrag(sortCriteria, "Author", "Author")).toBe(
      sortCriteria,
    );
  });

  test("dropping an available criterion on the selected container appends it", () => {
    expect(
      reorderAfterDrag(["Author"], "Title", SELECTED_CONTAINER_ID),
    ).toEqual(["Author", "Title"]);
  });

  test("dropping an available criterion on a selected item inserts it at that item's position", () => {
    expect(reorderAfterDrag(["Author", "Year"], "Title", "Year")).toEqual([
      "Author",
      "Title",
      "Year",
    ]);
  });

  test("dropping a selected criterion on the available container removes it", () => {
    expect(
      reorderAfterDrag(["Author", "Title"], "Author", AVAILABLE_CONTAINER_ID),
    ).toEqual(["Title"]);
  });

  test("dropping a selected criterion on an available item removes it", () => {
    expect(
      reorderAfterDrag(["Author", "Title"], "Author", "Relevance"),
    ).toEqual(["Title"]);
  });

  test("reorders within the selected list when dropped on another selected item", () => {
    expect(
      reorderAfterDrag(["Author", "Title", "Year"], "Year", "Author"),
    ).toEqual(["Year", "Author", "Title"]);
  });

  test("is a no-op when reordering onto its own current position", () => {
    const sortCriteria = ["Author", "Title"];
    expect(reorderAfterDrag(sortCriteria, "Author", "Author")).toBe(
      sortCriteria,
    );
  });

  test("is a no-op when the last item is dropped on empty space in its own (selected) container", () => {
    // activeId ("Title") and overId (the container itself) differ here, so this exercises the
    // oldIndex === newIndex short-circuit via a genuinely different path than dropping an item
    // on itself: the container's own droppable id resolves newIndex to sortCriteria.length - 1,
    // which already equals the last item's current index.
    const sortCriteria = ["Author", "Title"];
    expect(reorderAfterDrag(sortCriteria, "Title", SELECTED_CONTAINER_ID)).toBe(
      sortCriteria,
    );
  });

  test("dragging an available criterion that isn't dropped on anything selected-related does nothing new (still available)", () => {
    // Dropping one available item onto another available item: neither side changes, since
    // ordering within the available list carries no meaning (it's always CITATION_SORT_OPTIONS
    // order).
    expect(
      reorderAfterDrag(["Author"], "Title", AVAILABLE_CONTAINER_ID),
    ).toEqual(["Author"]);
  });
});

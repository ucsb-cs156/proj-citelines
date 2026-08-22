import {
  CITATION_SORT_OPTIONS,
  DEFAULT_CITATION_SORT,
  DEFAULT_DIRECTIONS,
  SELECTED_CONTAINER_ID,
  AVAILABLE_CONTAINER_ID,
  addCriterion,
  removeCriterion,
  toggleDirection,
  reorderAfterDrag,
  sortCriteriaComparator,
} from "main/utils/citationSort";

function entry(overrides = {}) {
  return { id: "e1", keyValuePairs: { ...overrides } };
}

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

  test("DEFAULT_DIRECTIONS has an entry for every sortable field", () => {
    CITATION_SORT_OPTIONS.forEach((field) => {
      expect(["asc", "desc"]).toContain(DEFAULT_DIRECTIONS[field]);
    });
  });
});

describe("addCriterion", () => {
  test("appends a criterion at its default direction", () => {
    expect(addCriterion([], "Author")).toEqual([
      { field: "Author", direction: DEFAULT_DIRECTIONS.Author },
    ]);
  });

  test("is a no-op if the field is already selected", () => {
    const sortCriteria = [{ field: "Author", direction: "desc" }];
    expect(addCriterion(sortCriteria, "Author")).toBe(sortCriteria);
  });
});

describe("removeCriterion", () => {
  test("removes a selected criterion by field", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ];
    expect(removeCriterion(sortCriteria, "Author")).toEqual([
      { field: "Title", direction: "asc" },
    ]);
  });

  test("is a no-op if the field isn't selected", () => {
    const sortCriteria = [{ field: "Author", direction: "asc" }];
    expect(removeCriterion(sortCriteria, "Title")).toEqual(sortCriteria);
  });
});

describe("toggleDirection", () => {
  test("flips ascending to descending", () => {
    expect(
      toggleDirection([{ field: "Author", direction: "asc" }], "Author"),
    ).toEqual([{ field: "Author", direction: "desc" }]);
  });

  test("flips descending to ascending", () => {
    expect(
      toggleDirection([{ field: "Author", direction: "desc" }], "Author"),
    ).toEqual([{ field: "Author", direction: "asc" }]);
  });

  test("only touches the matching field", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ];
    expect(toggleDirection(sortCriteria, "Title")).toEqual([
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "desc" },
    ]);
  });
});

describe("reorderAfterDrag", () => {
  test("returns the same array when there's no drop target", () => {
    const sortCriteria = [{ field: "Author", direction: "asc" }];
    expect(reorderAfterDrag(sortCriteria, "Title", null)).toBe(sortCriteria);
    expect(reorderAfterDrag(sortCriteria, "Title", undefined)).toBe(
      sortCriteria,
    );
  });

  test("returns the same array when dropped on itself", () => {
    const sortCriteria = [{ field: "Author", direction: "asc" }];
    expect(reorderAfterDrag(sortCriteria, "Author", "Author")).toBe(
      sortCriteria,
    );
  });

  test("dropping an available field on the selected container appends it at its default direction", () => {
    expect(
      reorderAfterDrag(
        [{ field: "Author", direction: "desc" }],
        "Title",
        SELECTED_CONTAINER_ID,
      ),
    ).toEqual([
      { field: "Author", direction: "desc" },
      { field: "Title", direction: DEFAULT_DIRECTIONS.Title },
    ]);
  });

  test("dropping an available field on a selected item inserts it at that item's position", () => {
    expect(
      reorderAfterDrag(
        [
          { field: "Author", direction: "asc" },
          { field: "Year", direction: "asc" },
        ],
        "Title",
        "Year",
      ),
    ).toEqual([
      { field: "Author", direction: "asc" },
      { field: "Title", direction: DEFAULT_DIRECTIONS.Title },
      { field: "Year", direction: "asc" },
    ]);
  });

  test("dropping a selected field on the available container removes it", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "desc" },
    ];
    expect(
      reorderAfterDrag(sortCriteria, "Author", AVAILABLE_CONTAINER_ID),
    ).toEqual([{ field: "Title", direction: "desc" }]);
  });

  test("dropping a selected field on an available item removes it", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "desc" },
    ];
    expect(reorderAfterDrag(sortCriteria, "Author", "Relevance")).toEqual([
      { field: "Title", direction: "desc" },
    ]);
  });

  test("reorders within the selected list, preserving each item's own direction", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "desc" },
      { field: "Year", direction: "asc" },
    ];
    expect(reorderAfterDrag(sortCriteria, "Year", "Author")).toEqual([
      { field: "Year", direction: "asc" },
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "desc" },
    ]);
  });

  test("is a no-op when reordering onto its own current position", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ];
    expect(reorderAfterDrag(sortCriteria, "Author", "Author")).toBe(
      sortCriteria,
    );
  });

  test("is a no-op when the last item is dropped on empty space in its own (selected) container", () => {
    const sortCriteria = [
      { field: "Author", direction: "asc" },
      { field: "Title", direction: "asc" },
    ];
    expect(reorderAfterDrag(sortCriteria, "Title", SELECTED_CONTAINER_ID)).toBe(
      sortCriteria,
    );
  });

  test("dropping one available field on another leaves both sides unchanged", () => {
    const sortCriteria = [{ field: "Author", direction: "asc" }];
    expect(
      reorderAfterDrag(sortCriteria, "Title", AVAILABLE_CONTAINER_ID),
    ).toEqual(sortCriteria);
  });
});

describe("sortCriteriaComparator", () => {
  test("an empty sortCriteria leaves the array's existing order untouched", () => {
    const entries = [
      entry({ author: "Zeta" }),
      entry({ author: "Alpha" }),
      entry({ author: "Mu" }),
    ];
    expect([...entries].sort(sortCriteriaComparator([]))).toEqual(entries);
  });

  test("Relevance descending sorts High to Unreviewed", () => {
    const high = entry({ citelines_relevance: "High" });
    const low = entry({ citelines_relevance: "Low" });
    const unreviewed = entry({});
    const sorted = [low, unreviewed, high].sort(
      sortCriteriaComparator([{ field: "Relevance", direction: "desc" }]),
    );
    expect(sorted).toEqual([high, low, unreviewed]);
  });

  test("Relevance ascending sorts Unreviewed to High", () => {
    const high = entry({ citelines_relevance: "High" });
    const low = entry({ citelines_relevance: "Low" });
    const unreviewed = entry({});
    const sorted = [high, low, unreviewed].sort(
      sortCriteriaComparator([{ field: "Relevance", direction: "asc" }]),
    );
    expect(sorted).toEqual([unreviewed, low, high]);
  });

  test("Year ascending sorts oldest first, with a missing/non-numeric year sorting last", () => {
    const y2020 = entry({ year: "2020" });
    const y1990 = entry({ year: "1990" });
    const noYear = entry({});
    const sorted = [y2020, noYear, y1990].sort(
      sortCriteriaComparator([{ field: "Year", direction: "asc" }]),
    );
    expect(sorted).toEqual([y1990, y2020, noYear]);
  });

  test("Year descending sorts newest first, with a missing/non-numeric year sorting first", () => {
    const y2020 = entry({ year: "2020" });
    const y1990 = entry({ year: "1990" });
    const noYear = entry({});
    const sorted = [y1990, y2020, noYear].sort(
      sortCriteriaComparator([{ field: "Year", direction: "desc" }]),
    );
    expect(sorted).toEqual([noYear, y2020, y1990]);
  });

  test("Author ascending sorts case-insensitively A to Z", () => {
    const bob = entry({ author: "bob" });
    const Alice = entry({ author: "Alice" });
    const sorted = [bob, Alice].sort(
      sortCriteriaComparator([{ field: "Author", direction: "asc" }]),
    );
    expect(sorted).toEqual([Alice, bob]);
  });

  test("Author descending reverses the order", () => {
    const bob = entry({ author: "bob" });
    const Alice = entry({ author: "Alice" });
    const sorted = [Alice, bob].sort(
      sortCriteriaComparator([{ field: "Author", direction: "desc" }]),
    );
    expect(sorted).toEqual([bob, Alice]);
  });

  test("Title sorts case-insensitively", () => {
    const zebra = entry({ title: "zebra" });
    const Apple = entry({ title: "Apple" });
    const sorted = [zebra, Apple].sort(
      sortCriteriaComparator([{ field: "Title", direction: "asc" }]),
    );
    expect(sorted).toEqual([Apple, zebra]);
  });

  test("Title comparison treats two spellings differing only in case as equal (a tie)", () => {
    expect(
      sortCriteriaComparator([{ field: "Title", direction: "asc" }])(
        entry({ title: "apple" }),
        entry({ title: "APPLE" }),
      ),
    ).toBe(0);
  });

  test("falls through to the next criterion, in its own direction, only when the current one ties", () => {
    const smithA = entry({ author: "Smith", title: "Banana" });
    const smithB = entry({ author: "Smith", title: "Apple" });
    const jones = entry({ author: "Jones", title: "Cherry" });
    // smithB is placed ahead of smithA here, the opposite of the expected tie-broken order below
    // — so a mutant that skips the Title tiebreak (leaving a stable sort to just preserve this
    // original relative order) would produce a different, wrong result, not one that happens to
    // coincide with the correct answer.
    const sorted = [smithB, jones, smithA].sort(
      sortCriteriaComparator([
        { field: "Author", direction: "asc" },
        { field: "Title", direction: "desc" },
      ]),
    );
    // Author ascending: Jones, then Smith/Smith tied on author, broken by Title descending
    // (Banana > Apple), putting smithA (Banana) ahead of smithB (Apple).
    expect(sorted).toEqual([jones, smithA, smithB]);
  });

  test("an entry with no author field sorts ahead of one that has an author, ascending", () => {
    const noAuthor = entry({});
    const adam = entry({ author: "Adam" });
    const sorted = [adam, noAuthor].sort(
      sortCriteriaComparator([{ field: "Author", direction: "asc" }]),
    );
    expect(sorted).toEqual([noAuthor, adam]);
  });

  test("does not throw when an entry has no keyValuePairs at all", () => {
    const bare = { id: "e1" };
    const adam = entry({ author: "Adam" });
    expect(() =>
      [adam, bare].sort(
        sortCriteriaComparator([
          { field: "Author", direction: "asc" },
          { field: "Year", direction: "asc" },
        ]),
      ),
    ).not.toThrow();
  });
});

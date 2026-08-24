import { renderHook, act } from "@testing-library/react";
import { useFilteredSortedCitations } from "main/utils/useFilteredSortedCitations";
import { DEFAULT_CITATION_FILTER } from "main/utils/citationFilter";
import { DEFAULT_CITATION_SORT } from "main/utils/citationSort";

function entry(overrides = {}) {
  return { id: overrides.id ?? "e1", keyValuePairs: { ...overrides } };
}

describe("useFilteredSortedCitations", () => {
  test("defaults to the full entry list, unfiltered and unsorted", () => {
    const entries = [
      entry({ id: "a", author: "Zeta" }),
      entry({ id: "b", author: "Alpha" }),
    ];
    const { result } = renderHook(() => useFilteredSortedCitations(entries));

    expect(result.current.filter).toEqual(DEFAULT_CITATION_FILTER);
    expect(result.current.sortCriteria).toEqual(DEFAULT_CITATION_SORT);
    expect(result.current.visibleCitations).toEqual(entries);
    expect(result.current.enableColumnSort).toBe(true);
  });

  test("setFilter narrows visibleCitations via matchesCitationFilter", () => {
    const entries = [
      entry({ id: "a", author: "Jones" }),
      entry({ id: "b", author: "Smith" }),
    ];
    const { result } = renderHook(() => useFilteredSortedCitations(entries));

    act(() => {
      result.current.setFilter({
        ...DEFAULT_CITATION_FILTER,
        search: "jones",
      });
    });

    expect(result.current.visibleCitations).toEqual([entries[0]]);
  });

  test("setSortCriteria sorts visibleCitations and sets enableColumnSort to false", () => {
    const entries = [
      entry({ id: "a", author: "Zeta" }),
      entry({ id: "b", author: "Alpha" }),
    ];
    const { result } = renderHook(() => useFilteredSortedCitations(entries));

    act(() => {
      result.current.setSortCriteria([{ field: "Author", direction: "asc" }]);
    });

    expect(result.current.visibleCitations).toEqual([entries[1], entries[0]]);
    expect(result.current.enableColumnSort).toBe(false);
  });

  test("clearing sortCriteria back to empty sets enableColumnSort back to true", () => {
    const entries = [entry({ id: "a" })];
    const { result } = renderHook(() => useFilteredSortedCitations(entries));

    act(() => {
      result.current.setSortCriteria([{ field: "Author", direction: "asc" }]);
    });
    expect(result.current.enableColumnSort).toBe(false);

    act(() => {
      result.current.setSortCriteria([]);
    });
    expect(result.current.enableColumnSort).toBe(true);
  });

  test("two independent hook instances don't share state", () => {
    const entriesA = [entry({ id: "a" })];
    const entriesB = [entry({ id: "b" })];
    const { result: a } = renderHook(() =>
      useFilteredSortedCitations(entriesA),
    );
    const { result: b } = renderHook(() =>
      useFilteredSortedCitations(entriesB),
    );

    act(() => {
      a.current.setSortCriteria([{ field: "Author", direction: "asc" }]);
    });

    expect(a.current.enableColumnSort).toBe(false);
    expect(b.current.enableColumnSort).toBe(true);
    expect(b.current.sortCriteria).toEqual(DEFAULT_CITATION_SORT);
  });
});

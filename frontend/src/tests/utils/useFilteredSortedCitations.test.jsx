import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { useFilteredSortedCitations } from "main/utils/useFilteredSortedCitations";
import { DEFAULT_CITATION_FILTER } from "main/utils/citationFilter";
import { DEFAULT_CITATION_SORT } from "main/utils/citationSort";

function entry(overrides = {}) {
  return { id: overrides.id ?? "e1", keyValuePairs: { ...overrides } };
}

function queryClientWrapper() {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useFilteredSortedCitations", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  test("defaults to the full entry list, unfiltered and unsorted", () => {
    const entries = [
      entry({ id: "a", author: "Zeta" }),
      entry({ id: "b", author: "Alpha" }),
    ];
    const { result } = renderHook(() => useFilteredSortedCitations(entries), {
      wrapper: queryClientWrapper(),
    });

    expect(result.current.filter).toEqual(DEFAULT_CITATION_FILTER);
    expect(result.current.sortCriteria).toEqual(DEFAULT_CITATION_SORT);
    expect(result.current.expanded).toBe(false);
    expect(result.current.sortExpanded).toBe(false);
    expect(result.current.visibleCitations).toEqual(entries);
    expect(result.current.enableColumnSort).toBe(true);
  });

  test("setExpanded toggles the expanded flag", () => {
    const { result } = renderHook(() => useFilteredSortedCitations([]), {
      wrapper: queryClientWrapper(),
    });

    act(() => {
      result.current.setExpanded(true);
    });

    expect(result.current.expanded).toBe(true);
  });

  test("setSortExpanded toggles the sortExpanded flag independently of expanded", () => {
    const { result } = renderHook(() => useFilteredSortedCitations([]), {
      wrapper: queryClientWrapper(),
    });

    act(() => {
      result.current.setSortExpanded(true);
    });

    expect(result.current.sortExpanded).toBe(true);
    expect(result.current.expanded).toBe(false);
  });

  test("setFilter narrows visibleCitations via matchesCitationFilter", () => {
    const entries = [
      entry({ id: "a", author: "Jones" }),
      entry({ id: "b", author: "Smith" }),
    ];
    const { result } = renderHook(() => useFilteredSortedCitations(entries), {
      wrapper: queryClientWrapper(),
    });

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
    const { result } = renderHook(() => useFilteredSortedCitations(entries), {
      wrapper: queryClientWrapper(),
    });

    act(() => {
      result.current.setSortCriteria([{ field: "Author", direction: "asc" }]);
    });

    expect(result.current.visibleCitations).toEqual([entries[1], entries[0]]);
    expect(result.current.enableColumnSort).toBe(false);
  });

  test("clearing sortCriteria back to empty sets enableColumnSort back to true", () => {
    const entries = [entry({ id: "a" })];
    const { result } = renderHook(() => useFilteredSortedCitations(entries), {
      wrapper: queryClientWrapper(),
    });

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
    const wrapper = queryClientWrapper();
    const { result: a } = renderHook(
      () => useFilteredSortedCitations(entriesA),
      {
        wrapper,
      },
    );
    const { result: b } = renderHook(
      () => useFilteredSortedCitations(entriesB),
      {
        wrapper,
      },
    );

    act(() => {
      a.current.setSortCriteria([{ field: "Author", direction: "asc" }]);
      a.current.setExpanded(true);
      a.current.setSortExpanded(true);
    });

    expect(a.current.enableColumnSort).toBe(false);
    expect(b.current.enableColumnSort).toBe(true);
    expect(b.current.sortCriteria).toEqual(DEFAULT_CITATION_SORT);
    expect(a.current.expanded).toBe(true);
    expect(b.current.expanded).toBe(false);
    expect(a.current.sortExpanded).toBe(true);
    expect(b.current.sortExpanded).toBe(false);
  });

  test("without persistence, no GET/POST is ever made", async () => {
    const { result } = renderHook(() => useFilteredSortedCitations([]), {
      wrapper: queryClientWrapper(),
    });

    act(() => {
      result.current.setFilter({ ...DEFAULT_CITATION_FILTER, search: "x" });
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(axiosMock.history.get.length).toBe(0);
    expect(axiosMock.history.post.length).toBe(0);
  });

  describe("with persistence", () => {
    const savedState = {
      relevance: ["High"],
      link: "doi",
      duplicates: "dup",
      search: "smith",
      tagIds: [2],
      tagMode: "or",
      expanded: true,
    };

    test("loads the saved state on mount and seeds filter/expanded from it", async () => {
      axiosMock.onGet("/api/citationfilterstate").reply(200, savedState);

      const { result } = renderHook(
        () =>
          useFilteredSortedCitations([], {
            projectId: 1,
            scope: "REFERENCES",
            entryId: "id-smith2020",
          }),
        { wrapper: queryClientWrapper() },
      );

      await waitFor(() => expect(result.current.expanded).toBe(true));
      expect(result.current.filter).toEqual({
        relevance: ["High"],
        link: "doi",
        duplicates: "dup",
        search: "smith",
        tagIds: [2],
        tagMode: "or",
      });
      expect(axiosMock.history.get[0].params).toEqual({
        projectId: 1,
        scope: "REFERENCES",
        entryId: "id-smith2020",
      });
    });

    test("does not autosave right after loading -- only a real change marks it dirty", async () => {
      axiosMock.onGet("/api/citationfilterstate").reply(200, savedState);
      axiosMock.onPost("/api/citationfilterstate").reply(200, savedState);

      const { result } = renderHook(
        () =>
          useFilteredSortedCitations([], {
            projectId: 1,
            scope: "PROJECT",
            autosaveIntervalMs: 30,
          }),
        { wrapper: queryClientWrapper() },
      );

      await waitFor(() => expect(result.current.expanded).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(axiosMock.history.post.length).toBe(0);
    });

    test("autosaves the current filter/expanded on the next heartbeat after a change", async () => {
      axiosMock.onGet("/api/citationfilterstate").reply(200, savedState);
      axiosMock.onPost("/api/citationfilterstate").reply(200, savedState);

      const { result } = renderHook(
        () =>
          useFilteredSortedCitations([], {
            projectId: 1,
            scope: "PROJECT",
            autosaveIntervalMs: 30,
          }),
        { wrapper: queryClientWrapper() },
      );

      await waitFor(() => expect(result.current.expanded).toBe(true));

      act(() => {
        result.current.setFilter({ ...result.current.filter, search: "jones" });
      });

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(axiosMock.history.post[0].params).toEqual({
        projectId: 1,
        scope: "PROJECT",
        entryId: undefined,
      });
      expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
        relevance: ["High"],
        link: "doi",
        duplicates: "dup",
        search: "jones",
        tagIds: [2],
        tagMode: "or",
        expanded: true,
      });
    });

    test("a second heartbeat with no further change does not autosave again", async () => {
      axiosMock.onGet("/api/citationfilterstate").reply(200, savedState);
      axiosMock.onPost("/api/citationfilterstate").reply(200, savedState);

      const { result } = renderHook(
        () =>
          useFilteredSortedCitations([], {
            projectId: 1,
            scope: "PROJECT",
            autosaveIntervalMs: 30,
          }),
        { wrapper: queryClientWrapper() },
      );

      await waitFor(() => expect(result.current.expanded).toBe(true));

      act(() => {
        result.current.setExpanded(false);
      });

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(axiosMock.history.post.length).toBe(1);
    });
  });
});
